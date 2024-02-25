const fs = require("fs");
require("dotenv").config();
const path = require("path");
const process = require("process");
const { google } = require("googleapis");

const SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
];

const KEYFILEPATH = path.join(process.cwd(), "credentials.json");

try {
    fs.readFileSync(KEYFILEPATH);
} catch (err) {
    fs.writeFileSync(KEYFILEPATH, process.env.CREDENTIALS);
}

const authClient = new google.auth.GoogleAuth({
    keyFile: KEYFILEPATH,
    scopes: SCOPES,
});

async function getSheetsData(
    range,
    sheetTitle = "Golden Ticket Datasheet",

    id = "14SflwbRknYyWZfTnvgYuZHFcivcHHIJdaMYclhIJEiM"
) {
    const sheetsService = google.sheets({ version: "v4", auth: authClient });
    const response = await sheetsService.spreadsheets.values.get({
        spreadsheetId: id,
        range: `${sheetTitle}!${range}`,
    });

    return response.data.values;
}

async function writeData(
    values,
    range,
    sheetTitle = "Golden Ticket Datasheet",
    id = "14SflwbRknYyWZfTnvgYuZHFcivcHHIJdaMYclhIJEiM"
) {
    const resource = {
        values,
    };

    const sheetsService = google.sheets({ version: "v4", auth: authClient });
    const response = await sheetsService.spreadsheets.values.update({
        spreadsheetId: id,
        range: `${sheetTitle}!${range}`,
        valueInputOption: "RAW",
        resource,
    });
}

async function getGoldenTicketsSheet() {
    const sheet_data = await getSheetsData("A2:H11");
    return sheet_data;
}

async function writeGoldenTicketsSheet(values) {
    writeData(values, "A2:H11");
}

async function getImageSubmissionSheet() {
    const sheet_data = await getSheetsData(
        "A2:G12",
        (sheetTitle = "Image Submissions")
    );
    return sheet_data;
}

async function writeImageSubmissionSheet(values) {
    writeData(values, "A2:H12", (sheetTitle = "Image Submissions"));
}

async function saveImageDataToDrive(base64String) {
    const drive = google.drive({ version: "v3", auth: authClient });

    const fileMetadata = {
        name: `${Math.floor(Math.random() * 10000000)}.txt`,
        parents: ["1CTmtWQUu2AMth6-b_y7Akfacmnivzuls"],
        mimeType: "text/plain",
        uploadType: "media",
    };

    image_data_id = await new Promise((resolve, reject) => {
        drive.files.create(
            {
                resource: fileMetadata,
                media: {
                    mimeType: "text/plain",
                    body: base64String,
                },

                fields: "id, webViewLink", // Request fields 'id' and 'webViewLink'
            },
            (err, file) => {
                if (err) {
                    reject(err);
                }

                resolve(file.data.id);
            }
        );
    });

    return image_data_id;
}

async function getImageDataFromDrive(id) {
    const drive = google.drive({ version: "v3", auth: authClient });

    image_data = await new Promise((resolve, reject) => {
        drive.files.get(
            {
                fileId: id,
                alt: "media", // Get file content as media
            },
            (err, res) => {
                if (err) {
                    reject(err);
                }

                resolve(res.data);
            }
        );
    });

    return image_data;
}

module.exports = {
    getGoldenTicketsSheet,
    writeGoldenTicketsSheet,
    getImageSubmissionSheet,
    writeImageSubmissionSheet,
    saveImageDataToDrive,
    getImageDataFromDrive,
};
