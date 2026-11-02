# readpst

Convert Outlook `.pst` (and `.ost`) files to `.eml` files from Node.js, using [libpst](https://www.five-ten-sg.com/libpst/)'s `readpst`.

## Install

The `readpst` binary must be on your `PATH`:

```sh
brew install libpst      # macOS
apt install pst-utils    # Debian/Ubuntu
```

Alpine has no libpst package; build it from [source](https://www.five-ten-sg.com/libpst/) with `libgsf-dev` installed and `CFLAGS="-std=gnu17"` (GCC 15 rejects its pre-C23 declarations).

```sh
npm install readpst
```

## Usage

```js
import { extract } from "readpst";

const files = await extract("mailbox.pst", { outDir: "out" });
// ["/abs/out/Inbox/1.eml", "/abs/out/Sent Items/1.eml", ...]
```

### Without managing files

`read` extracts into a temp dir, yields each item and removes the dir when the loop ends (also on `break` or a thrown error):

```js
import { read } from "readpst";

for await (const item of read("mailbox.pst")) {
  item.path;             // "Inbox/1.eml"
  await item.buffer();   // Buffer
  item.stream();         // fs.ReadStream, e.g. to upload to S3
}
```

Consume each item's buffer or stream before moving to the next one; the files are gone once the loop finishes.

### Writing to a directory

`extract` writes to a directory you own and returns the file paths. `outDir` mirrors the PST's folder tree, with one RFC 822 `.eml` per message and attachments kept inline as MIME parts. Text is written as UTF-8.

### Options

| Option        | Default       | Description                                                       |
| ------------- | ------------- | ----------------------------------------------------------------- |
| `outDir`      | (required)    | `extract` only: output directory, created if missing              |
| `types`       | `["email"]`   | Any of `"email"`, `"appointment"`, `"journal"`, `"contact"`       |
| `readpstPath` | `"readpst"`   | Path to the binary                                                |

`readpst` needs a seekable file on local disk, so download a remote PST to a temp file first. With `extract`, cleaning up `outDir` is up to you.

## License

MIT. libpst itself is GPL-2.0; this package only runs it as a separate program and does not bundle it.
