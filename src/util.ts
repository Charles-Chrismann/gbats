export function hex(number, leading, usePrefix?) {
	if (typeof usePrefix === "undefined") {
		usePrefix = true;
	}
	if (typeof leading === "undefined") {
		leading = 8;
	}
	var string = (number >>> 0).toString(16).toUpperCase();
	leading -= string.length;
	if (leading < 0) return string;
	return (usePrefix ? "0x" : "") + new Array(leading + 1).join("0") + string;
}

export class Pointer {
  index: number
  top: number
  stack: any[]
	constructor() {
		this.index = 0;
		this.top = 0;
		this.stack = [];
	}
	advance(amount) {
		var index = this.index;
		this.index += amount;
		return index;
	}
	mark() {
		return this.index - this.top;
	}
	push() {
		this.stack.push(this.top);
		this.top = this.index;
	}
	pop() {
		this.top = this.stack.pop();
	}
	readString(view) {
		var length = view.getUint32(this.advance(4), true);
		var bytes = [];
		for (var i = 0; i < length; ++i) {
			bytes.push(String.fromCharCode(view.getUint8(this.advance(1))));
		}
		return bytes.join("");
	}
}

export class Serializer {
	static TAG_INT = 1;
	static TAG_STRING = 2;
	static TAG_STRUCT = 3;
	static TAG_BLOB = 4;
	static TAG_BOOLEAN = 5;
	static TYPE = "application/octet-stream";

	static pack(value) {
		var object = new DataView(new ArrayBuffer(4));
		object.setUint32(0, value, true);
		return object.buffer;
	}

	static pack8(value) {
		var object = new DataView(new ArrayBuffer(1));
		object.setUint8(0, value);
		return object.buffer;
	}

	static prefix(value) {
		return new Blob(
			[
				Serializer.pack(value.size || value.length || value.byteLength),
				value
			],
			{ type: Serializer.TYPE }
		);
	}

	static serialize(stream) {
		var parts = [];
		var size = 4;
		for (const i of Object.keys(stream)) {
      if (stream.hasOwnProperty(i)) {
				var tag;
				var head = Serializer.prefix(i);
				var body;
				switch (typeof stream[i]) {
					case "number":
						tag = Serializer.TAG_INT;
						body = Serializer.pack(stream[i]);
						break;
					case "string":
						tag = Serializer.TAG_STRING;
						body = Serializer.prefix(stream[i]);
						break;
					case "object":
						if (stream[i].type == Serializer.TYPE) {
							tag = Serializer.TAG_BLOB;
							body = stream[i];
						} else {
							tag = Serializer.TAG_STRUCT;
							body = Serializer.serialize(stream[i]);
						}
						break;
					case "boolean":
						tag = Serializer.TAG_BOOLEAN;
						body = Serializer.pack8(stream[i]);
						break;
					default:
						break;
				}
				size +=
					1 +
					head.size +
					(body.size || body.byteLength || body.length);
				parts.push(Serializer.pack8(tag));
				parts.push(head);
				parts.push(body);
			}
		}
		parts.unshift(Serializer.pack(size));
		return new Blob(parts);
	}

	static deserialize(blob, callback) {
		var reader = new FileReader();
		reader.onload = function (data) {
			callback(
				Serializer.deserealizeStream(
					new DataView(data.target.result as ArrayBufferLike & { BYTES_PER_ELEMENT?: never; }),
					new Pointer()
				)
			);
		};
		reader.readAsArrayBuffer(blob);
	}

	static deserealizeStream(view, pointer) {
		pointer.push();
		var object = {};
		var remaining = view.getUint32(pointer.advance(4), true);
		while (pointer.mark() < remaining) {
			var tag = view.getUint8(pointer.advance(1));
			var head = pointer.readString(view);
			var body;
			switch (tag) {
				case Serializer.TAG_INT:
					body = view.getUint32(pointer.advance(4), true);
					break;
				case Serializer.TAG_STRING:
					body = pointer.readString(view);
					break;
				case Serializer.TAG_STRUCT:
					body = Serializer.deserealizeStream(view, pointer);
					break;
				case Serializer.TAG_BLOB:
					var size = view.getUint32(pointer.advance(4), true);
					body = view.buffer.slice(
						pointer.advance(size),
						pointer.advance(0)
					);
					break;
				case Serializer.TAG_BOOLEAN:
					body = !!view.getUint8(pointer.advance(1));
					break;
			}
			object[head] = body;
		}
		if (pointer.mark() > remaining) {
			throw "Size of serialized data exceeded";
		}
		pointer.pop();
		return object;
	}

	static serializePNG(blob, base, callback) {
		var canvas = document.createElement("canvas");
		var context = canvas.getContext("2d");
		var pixels = base
			.getContext("2d")
			.getImageData(0, 0, base.width, base.height);
		var transparent = 0;
		for (var y = 0; y < base.height; ++y) {
			for (var x = 0; x < base.width; ++x) {
				if (!pixels.data[(x + y * base.width) * 4 + 3]) {
					++transparent;
				}
			}
		}
		var bytesInCanvas =
			transparent * 3 + (base.width * base.height - transparent);
		for (
			var multiplier = 1;
			bytesInCanvas * multiplier * multiplier < blob.size;
			++multiplier
		);
		var edges = bytesInCanvas * multiplier * multiplier - blob.size;
		var padding = Math.ceil(edges / (base.width * multiplier));
		canvas.setAttribute("width", String(base.width * multiplier));
		canvas.setAttribute("height", String(base.height * multiplier + padding));

		var reader = new FileReader();
		reader.onload = function (data) {
			var view = new Uint8Array(data.target.result as any);
			var pointer = 0;
			var pixelPointer = 0;
			var newPixels = context.createImageData(
				canvas.width,
				canvas.height + padding
			);
			for (var y = 0; y < canvas.height; ++y) {
				for (var x = 0; x < canvas.width; ++x) {
					var oldY = (y / multiplier) | 0;
					var oldX = (x / multiplier) | 0;
					if (
						oldY > base.height ||
						!pixels.data[(oldX + oldY * base.width) * 4 + 3]
					) {
						newPixels.data[pixelPointer++] = view[pointer++];
						newPixels.data[pixelPointer++] = view[pointer++];
						newPixels.data[pixelPointer++] = view[pointer++];
						newPixels.data[pixelPointer++] = 0;
					} else {
						var byte = view[pointer++];
						newPixels.data[pixelPointer++] =
							pixels.data[(oldX + oldY * base.width) * 4 + 0] |
							(byte & 7);
						newPixels.data[pixelPointer++] =
							pixels.data[(oldX + oldY * base.width) * 4 + 1] |
							((byte >> 3) & 7);
						newPixels.data[pixelPointer++] =
							pixels.data[(oldX + oldY * base.width) * 4 + 2] |
							((byte >> 6) & 7);
						newPixels.data[pixelPointer++] =
							pixels.data[(oldX + oldY * base.width) * 4 + 3];
					}
				}
			}
			context.putImageData(newPixels, 0, 0);
			callback(canvas.toDataURL("image/png"));
		};
		reader.readAsArrayBuffer(blob);
		return canvas;
	}

	static deserializePNG(blob, callback) {
		var reader = new FileReader();
		reader.onload = function (data) {
			var image = document.createElement("img");
			image.setAttribute("src", String(data.target.result));
			var canvas = document.createElement("canvas");
			canvas.setAttribute("height", String(image.height));
			canvas.setAttribute("width", String(image.width));
			var context = canvas.getContext("2d");
			context.drawImage(image, 0, 0);
			var pixels = context.getImageData(
				0,
				0,
				canvas.width,
				canvas.height
			);
			var newData = [];
			for (var y = 0; y < canvas.height; ++y) {
				for (var x = 0; x < canvas.width; ++x) {
					if (!pixels.data[(x + y * canvas.width) * 4 + 3]) {
						newData.push(pixels.data[(x + y * canvas.width) * 4 + 0]);
						newData.push(pixels.data[(x + y * canvas.width) * 4 + 1]);
						newData.push(pixels.data[(x + y * canvas.width) * 4 + 2]);
					} else {
						var byte = 0;
						byte |= pixels.data[(x + y * canvas.width) * 4 + 0] & 7;
						byte |=
							(pixels.data[(x + y * canvas.width) * 4 + 1] & 7) <<
							3;
						byte |=
							(pixels.data[(x + y * canvas.width) * 4 + 2] & 7) <<
							6;
              newData.push(byte);
					}
				}
			}
			const newBlob = new Blob(
				newData.map(function (byte) {
					var array = new Uint8Array(1);
					array[0] = byte;
					return array;
				}),
				{ type: Serializer.TYPE }
			);
			Serializer.deserialize(newBlob, callback);
		};
		reader.readAsDataURL(blob);
	}
}

export function toArrayBuffer(buffer: Buffer) {
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

export function encode (input: Uint8Array) {
  var keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  var output = "";
  var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
  var i = 0;

  while (i < input.length) {
      chr1 = input[i++];
      chr2 = i < input.length ? input[i++] : Number.NaN; // Not sure if the index 
      chr3 = i < input.length ? input[i++] : Number.NaN; // checks are needed here

      enc1 = chr1 >> 2;
      enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
      enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
      enc4 = chr3 & 63;

      if (isNaN(chr2)) {
          enc3 = enc4 = 64;
      } else if (isNaN(chr3)) {
          enc4 = 64;
      }
      output += keyStr.charAt(enc1) + keyStr.charAt(enc2) +
                keyStr.charAt(enc3) + keyStr.charAt(enc4);
  }
  return output;
}

export function dataURItoBlob(dataURI: string) {
  let byteString;
  if (dataURI.split(',')[0].indexOf('base64') >= 0)
    byteString = atob(dataURI.split(',')[1]);
  else
    byteString = unescape(dataURI.split(',')[1]);

  let mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];

  let ia = new Uint8Array(byteString.length);
  for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
  }

  return new Blob([ia], {type:mimeString});
}

export function str2ab(str: string) {
  var buf = new ArrayBuffer(str.length*2); // 2 bytes for each char
  var bufView = new Uint16Array(buf);
  for (var i=0, strLen=str.length; i<strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}

export function b64DecodeUnicode(str: string) {
  // Going backwards: from bytestream, to percent-encoding, to original string.
  return decodeURIComponent(atob(str).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
  }).join(''));
}

export function b64EncodeUnicode(str) {
  // first we use encodeURIComponent to get percent-encoded Unicode,
  // then we convert the percent encodings into raw bytes which
  // can be fed into btoa.
  return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
      function toSolidBytes(match, p1) {
          return String.fromCharCode(+('0x' + p1));
  }));
}

export function base64ToArrayBuffer(base64) {
  var binaryString = atob(base64);
  var bytes = new Uint8Array(binaryString.length);
  for (var i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

export function toBuffer(arrayBuffer) {
  const buffer = Buffer.alloc(arrayBuffer.byteLength);
  const view = new Uint8Array(arrayBuffer);
  for (let i = 0; i < buffer.length; ++i) {
    buffer[i] = view[i];
  }
  return buffer;
}