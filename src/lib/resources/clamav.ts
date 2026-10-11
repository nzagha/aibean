import { createConnection } from "node:net";
import type { ResourceScanner } from "./contracts";
export function loopbackResourceScanner(
  port = Number(process.env.AIBEAN_CLAMAV_PORT),
): ResourceScanner {
  if (!Number.isInteger(port) || port < 1024 || port > 65535)
    throw new Error("Configure the private loopback malware scanner.");
  return {
    scan: (bytes) =>
      new Promise((resolve, reject) => {
        const socket = createConnection({ host: "127.0.0.1", port });
        let result = "";
        let finished = false;
        const end = (error?: Error, value?: "clean" | "infected") => {
          if (finished) return;
          finished = true;
          socket.destroy();
          if (error) reject(error);
          else resolve(value!);
        };
        socket.setTimeout(10000, () =>
          end(new Error("Resource scanning timed out.")),
        );
        socket.on("error", () =>
          end(new Error("Resource scanner unavailable.")),
        );
        socket.on("end", () => {
          if (!finished) end(new Error("Resource scanning incomplete."));
        });
        socket.on("data", (chunk) => {
          result += chunk.toString();
          if (result.length > 1024)
            return end(new Error("Invalid scanner response."));
          if (result.includes("\0")) {
            if (/^stream: OK\0$/.test(result)) end(undefined, "clean");
            else if (/^stream: .+ FOUND\0$/.test(result))
              end(undefined, "infected");
            else
              end(new Error("Resource scanner did not verify a clean result."));
          }
        });
        socket.on("connect", () => {
          socket.write("zINSTREAM\0");
          for (let offset = 0; offset < bytes.length; offset += 65536) {
            const part = bytes.subarray(offset, offset + 65536),
              length = Buffer.alloc(4);
            length.writeUInt32BE(part.length);
            socket.write(length);
            socket.write(part);
          }
          socket.write(Buffer.alloc(4));
        });
      }),
  };
}
