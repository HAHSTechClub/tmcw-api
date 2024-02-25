const express = require("express");
const cors = require("cors");
const moment = require("moment-timezone");
require("dotenv").config();
const process = require("process");

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

const {
    getGoldenTicketsSheet,
    writeGoldenTicketsSheet,
    getImageSubmissionSheet,
    writeImageSubmissionSheet,
    saveImageDataToDrive,
} = require("./googleFunctions.js");

PORT = 3000;

app.get("/submit", async (request, response) => {
    const users_code = request.query.code;
    const users_name = request.query.name;
    const users_rollClass = request.query.rollClass;

    currentSheetsData = await getGoldenTicketsSheet();

    const codes = currentSheetsData.map((a) => a[3]);

    if (!codes.includes(users_code)) {
        response.json({
            status: "Incorrect",
            message: "Sorry, your guess was incorrect. 😔",
        });
        return;
    }

    const code_index = codes.indexOf(users_code);

    if (
        !(
            currentSheetsData[code_index][4] == "" ||
            currentSheetsData[code_index][4] == undefined
        )
    ) {
        response.json({
            status: "Duplicate",
            message: "Sorry, someone has already guessed this code. 🙃",
        });
        return;
    }

    currentSheetsData[code_index][4] = users_name;
    currentSheetsData[code_index][5] = users_rollClass;
    writeGoldenTicketsSheet(currentSheetsData);

    response.json({
        status: "Success",
        message: `Congratulations! You were the first person to guess this code. 🎉
        
        You have won ${currentSheetsData[code_index][6]}. 
        
        As a bonus challenge, ${currentSheetsData[code_index][7]}!`,
    });
});

app.post("/submit-image", async (request, response) => {
    const users_name = request.query.name;
    const users_rollClass = request.query.rollClass;
    const users_code = request.query.code;
    const users_image = request.body.image;

    const image_data_url = await saveImageDataToDrive(users_image);

    let golden_ticket_id;

    switch (users_code) {
        case "Chessboard":
            golden_ticket_id = "10";
            break;
        case "Triangle":
            golden_ticket_id = "11";
            break;
        default:
            response.status(400).send({
                message: "Not image submission",
            });
            return;
    }

    let submissionData = await getImageSubmissionSheet();

    submissionData = submissionData == undefined ? [] : submissionData;

    const id = submissionData.length + 1;
    const sydneyTime = moment().tz("Australia/Sydney");
    const formattedDate = sydneyTime.format("YYYY-MM-DD HH:mm:ss");

    const new_row = [
        id,
        golden_ticket_id,
        users_name,
        users_rollClass,
        image_data_url,
        formattedDate,
        false,
    ];

    submissionData.push(new_row);

    writeImageSubmissionSheet(submissionData);

    response.json({
        status: "Uploaded Solution",
        message:
            "Your image has been uploaded! Our execs will verify your solution soon. If your answer is correct, and you were the first solver for this challenge, your name will appear in the Submitted Challenges section below. Check back soon!",
    });
});

app.get("/get-unverified-submissions", async (request, response) => {
    const userAdminCode = request.query.adminCode;
    const actualAdminCode = process.env.ADMIN_CODE;

    if (userAdminCode != actualAdminCode) {
        response.status(400).send({
            message: "Incorrect Admin Code",
        });
        return;
    }
    let submissionData = await getImageSubmissionSheet();

    submissionData = submissionData == undefined ? [] : submissionData;

    let verified_ids = [];

    submissionData.forEach((row) => {
        if (row[6] == "TRUE" && !verified_ids.includes(row[1])) {
            verified_ids.push(row[1]);
        }
    });

    const unverified_rows = submissionData.filter(
        (row) => !verified_ids.includes(row[1])
    );

    response.json(
        unverified_rows.map((row) => {
            return {
                id: row[0],
                goldenTicketId: row[1],
                name: row[2],
                rollClass: row[3],
                image: row[4],
                timestamp: row[5],
                isAccepted: row[6],
            };
        })
    );
});

app.get("/verify-submission", async (request, response) => {
    const userAdminCode = request.query.adminCode;
    const actualAdminCode = process.env.ADMIN_CODE;

    if (userAdminCode != actualAdminCode) {
        response.status(400).send({
            message: "Incorrect Admin Code",
        });
        return;
    }

    let submissionData = await getImageSubmissionSheet();
    submissionData = submissionData == undefined ? [] : submissionData;

    const id = request.query.id;

    if (!submissionData.map((row) => row[0]).includes(id)) {
        response.status(400).send({
            message: "Non-existent submission",
        });
        return;
    }

    submissionData[parseInt(id) - 1][6] = "TRUE";

    await writeImageSubmissionSheet(submissionData);
    response.json({ status: "Success" });
});

app.get("/get-submitted-code-information", async (request, response) => {
    const currentSheetsData = await getGoldenTicketsSheet();
    const submittedRows = currentSheetsData.filter(
        (row) => !(row[4] == "" || row[4] == undefined)
    );

    const formattedData = submittedRows.map((row) => {
        return {
            id: row[0],
            challengeName: row[2],
            solution: row[3],
            winner: row[4],
            rollClass: row[5],
            prize: row[6],
            challenge: row[7],
        };
    });

    response.json(formattedData);
});

app.listen(PORT, () => console.log(`listening on port ${PORT}`));
