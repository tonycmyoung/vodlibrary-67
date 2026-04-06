import sharp from "sharp"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const publicDir = path.join(__dirname, "..", "public")

async function resizeIcon() {
  const inputPath = path.join(publicDir, "icon-192.jpg")
  const outputPath = path.join(publicDir, "icon-512.jpg")

  await sharp(inputPath)
    .resize(512, 512, {
      fit: "cover",
      kernel: sharp.kernel.lanczos3,
    })
    .jpeg({ quality: 90 })
    .toFile(outputPath)

  console.log("Created icon-512.jpg from icon-192.jpg")
}

resizeIcon().catch(console.error)
