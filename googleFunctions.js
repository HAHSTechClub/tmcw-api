const fs = require("fs");
require("dotenv").config();
const path = require("path");
const process = require("process");
const { google } = require("googleapis");

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

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
    id = "14SflwbRknYyWZfTnvgYuZHFcivcHHIJdaMYclhIJEiM"
) {
    const sheetsService = google.sheets({ version: "v4", auth: authClient });
    const response = await sheetsService.spreadsheets.values.get({
        spreadsheetId: id,
        range: range,
    });

    return response.data.values;
}

async function getCodesAndWinners() {
    const sheet_data = await getSheetsData("C2:F11");
    return sheet_data;
}

async function writeData(
    values,
    range,
    id = "14SflwbRknYyWZfTnvgYuZHFcivcHHIJdaMYclhIJEiM"
) {
    const resource = {
        values,
    };

    const sheetsService = google.sheets({ version: "v4", auth: authClient });
    const response = await sheetsService.spreadsheets.values.update({
        spreadsheetId: id,
        range,
        valueInputOption: "RAW",
        resource,
    });
}

async function writeCodesAndWinners(values) {
    writeData(values, "C2:F11");
}

module.exports = {
    getCodesAndWinners,
    writeCodesAndWinners,
};
