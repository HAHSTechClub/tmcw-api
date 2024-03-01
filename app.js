const express = require("express");
const cors = require("cors");
const moment = require("moment-timezone");
require("dotenv").config();
const process = require("process");
const rateLimit = require("express-rate-limit");

const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 15 minutes
    max: 10, // maximum of 100 requests within 15 minutes
    validate: { xForwardedForHeader: false },
});

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.use(limiter);

const {
    getGoldenTicketsSheet,
    writeGoldenTicketsSheet,
    getImageSubmissionSheet,
    writeImageSubmissionSheet,
    saveImageDataToDrive,
    getImageDataFromDrive,
} = require("./googleFunctions.js");

PORT = 3000;

app.get("/submit-code", async (request, response) => {
    const users_code = request.query.code;
    const users_name = request.query.name;
    const users_rollClass = request.query.rollClass;

    currentSheetsData = await getGoldenTicketsSheet();

    const codeChallenges = currentSheetsData.filter((a) => a[3] == "Code");

    const codes = codeChallenges.map((a) => a[4]);

    if (!codes.includes(users_code)) {
        response.json({
            status: "Incorrect",
            message: "Sorry, your guess was incorrect. 😔",
        });
        return;
    }

    const challengeRow = codeChallenges.find((a) => a[4] == users_code);

    const challengeIndex = challengeRow[0] - 1;

    if (
        !(
            currentSheetsData[challengeIndex][5] == "" ||
            currentSheetsData[challengeIndex][5] == undefined
        )
    ) {
        response.json({
            status: "Duplicate",
            message: "Sorry, someone has already guessed this code. 🙃",
        });
        return;
    }

    currentSheetsData[challengeIndex][5] = users_name;
    currentSheetsData[challengeIndex][6] = users_rollClass;
    writeGoldenTicketsSheet(currentSheetsData);

    response.json({
        status: "Success",
        message: `Congratulations! You were the first person to guess this code. 🎉
        
        You have won ${currentSheetsData[code_index][7]}. 
        
        As a bonus challenge, ${currentSheetsData[code_index][8]}!`,
    });
});

app.post("/submit-image", async (request, response) => {
    const users_name = request.query.name;
    const users_rollClass = request.query.rollClass;
    const users_challengeName = request.query.challengeName;
    const users_image = request.body.image;

    currentSheetsData = await getGoldenTicketsSheet();

    const imageChallenges = currentSheetsData.filter((a) => a[3] == "Image");

    const imageChallengeNames = imageChallenges.map((a) => a[2]);

    if (!imageChallengeNames.includes(users_challengeName)) {
        response.json({
            status: "How have you done this???",
            message: "This challenge does not exist.",
        });
        return;
    }

    const challengeRow = imageChallenges.find(
        (a) => a[2] == users_challengeName
    );

    const challengeIndex = challengeRow[0] - 1;

    if (
        !(
            currentSheetsData[challengeIndex][5] == "" ||
            currentSheetsData[challengeIndex][5] == undefined
        )
    ) {
        response.json({
            status: "Duplicate",
            message: "Sorry, someone has already solved this puzzle. 🙃",
        });
        return;
    }

    const image_data_url = await saveImageDataToDrive(users_image);

    let submissionData = await getImageSubmissionSheet();

    submissionData = submissionData == undefined ? [] : submissionData;

    const id = submissionData.length + 1;
    const sydneyTime = moment().tz("Australia/Sydney");
    const formattedDate = sydneyTime.format("YYYY-MM-DD HH:mm:ss");

    const new_row = [
        id,
        users_challengeName,
        users_name,
        users_rollClass,
        image_data_url,
        formattedDate,
        "UNVERIFIED",
    ];

    submissionData.push(new_row);

    writeImageSubmissionSheet(submissionData);

    response.json({
        status: "Uploaded Solution",
        message:
            "Your image has been uploaded! Our execs will verify your solution soon. If your answer is correct, and you were the first solver for this challenge, your name will appear in the Submitted Challenges section below. Check back soon!",
    });
});

app.get("/get-submissions", async (request, response) => {
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

    const response_obj = await Promise.all(
        submissionData.map(async (row) => {
            const image_id = row[4];
            const image_data = await getImageDataFromDrive(image_id);

            return {
                id: row[0],
                goldenTicketId: row[1],
                name: row[2],
                rollClass: row[3],
                image: image_data,
                timestamp: row[5],
                isAccepted: row[6],
            };
        })
    );
    response.json(response_obj);
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

    if (submissionData[parseInt(id) - 1][6] == "VERIFIED") {
        response.status(400).send({
            message: "Submission already verified",
        });
        return;
    }

    const challengeName = submissionData[parseInt(id) - 1][1];
    const name = submissionData[parseInt(id) - 1][2];
    const rollClass = submissionData[parseInt(id) - 1][3];

    submissionData[parseInt(id) - 1][6] = "VERIFIED";

    submissionData.forEach((row) => {
        if (row[0] != id && row[1] == challengeName) {
            row[6] = "UNVERIFIED";
        }
    });

    const goldenTicketsData = await getGoldenTicketsSheet();
    goldenTicketID = goldenTicketsData
        .filter((a) => a[3] == "Image")
        .find((a) => a[2] == challengeName)[0];

    goldenTicketsData[goldenTicketID - 1][5] = name;
    goldenTicketsData[goldenTicketID - 1][6] = rollClass;

    await writeGoldenTicketsSheet(goldenTicketsData);
    await writeImageSubmissionSheet(submissionData);
    response.json({ status: "Success" });
});

app.get("/unverify-submission", async (request, response) => {
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

    if (submissionData[parseInt(id) - 1][6] == "UNVERIFIED") {
        response.status(400).send({
            message: "Submission already unverified",
        });
        return;
    }

    const challengeName = submissionData[parseInt(id) - 1][1];
    const name = submissionData[parseInt(id) - 1][2];
    const rollClass = submissionData[parseInt(id) - 1][3];

    submissionData[parseInt(id) - 1][6] = "UNVERIFIED";

    const goldenTicketsData = await getGoldenTicketsSheet();
    goldenTicketID = goldenTicketsData
        .filter((a) => a[3] == "Image")
        .find((a) => a[2] == challengeName)[0];

    goldenTicketsData[goldenTicketID - 1][5] = "";
    goldenTicketsData[goldenTicketID - 1][6] = "";

    await writeGoldenTicketsSheet(goldenTicketsData);
    await writeImageSubmissionSheet(submissionData);
    response.json({ status: "Success" });
});

app.get("/get-submitted-submissions-data", async (request, response) => {
    const currentSheetsData = await getGoldenTicketsSheet();
    const submittedRows = currentSheetsData.filter(
        (row) => !(row[5] == "" || row[5] == undefined)
    );

    const formattedData = submittedRows.map((row) => {
        return {
            id: row[0],
            challengeName: row[2],
            submissionType: row[3],
            solution: row[4],
            winner: row[5],
            rollClass: row[6],
            prize: row[7],
            challenge: row[8],
        };
    });

    response.json(formattedData);
});

app.listen(PORT, () => console.log(`listening on port ${PORT}`));
