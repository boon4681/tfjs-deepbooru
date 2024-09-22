const express = require('express');
const app = express();
const tf = require('@tensorflow/tfjs-node');
const multer = require('multer');
const sharp = require('sharp');
const storage = multer.memoryStorage()
const upload = multer({ storage: storage })
const handler = tf.io.fileSystem(`${__dirname}/../tfjs/model.json`);
const { tags } = require("./tags")
var argv = require('minimist')(process.argv.slice(2));
const port = Number(argv.port ?? '3000');
let mark = false
let model;
function loadModel() {
    return new Promise(async (rev) => {
        const v = setInterval(() => {
            if (model) {
                clearInterval(v)
                rev()
            }
        }, 100);
        if (!mark && !model) {
            mark = true
            console.log("LOADING MODEL")
            model = await tf.loadLayersModel(handler)
            console.log("MODEL LOADED")
            rev()
        }
    })
}
loadModel()

async function preprocessImage(imagePath) {
    const image = await sharp(imagePath)
        .resize(512, 512) // Resize to 512x512, as expected by the model
        .toFormat('png') // Ensure the image is in PNG format
        .toBuffer();

    const tensor = tf.node.decodeImage(image, 3)
        .toFloat()
        .expandDims(0) // Add batch dimension
        .div(tf.scalar(255.0)); // Normalize between 0 and 1

    return tensor;
}

function getTopTags(predictionArray, threshold = 0.5) {
    return tags
        .map((tag, index) => ({ tag, probability: predictionArray[index] }))
        .filter(item => item.probability >= threshold)
        .sort((a, b) => b.probability - a.probability)
        .map((a) => ({ tag: a.tag, probability: a.probability.toPrecision(6) }))
}

app.post('/predict', upload.single('image'), async (req, res) => {
    try {
        await loadModel()
        const imageBuffer = req.file.buffer;
        const preprocessedImage = await preprocessImage(imageBuffer);
        const predictions = model.predict(preprocessedImage);
        const predictionArray = predictions.dataSync();
        const predictedTags = getTopTags(predictionArray);
        res.json({ tags: predictedTags });
    } catch (error) {
        res.status(500).send(error.message);
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
