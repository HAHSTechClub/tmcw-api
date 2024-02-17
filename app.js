const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors);

const {
    getCodesAndWinners,
    writeCodesAndWinners,
} = require("./googleFunctions.js");

PORT = 3000;

app.get("/submit", async (request, response) => {
    const users_code = request.query.code;
    const users_name = request.query.name;
    const users_rollClass = request.query.rollClass;

    currentSheetsData = await getCodesAndWinners();

    const codes = currentSheetsData.map((a) => a[0]);

    if (!codes.includes(users_code)) {
        response.json({
            status: "Incorrect",
            message: "Sorry, your guess was incorrect. 😔",
        });
        return;
    }

    const code_index = codes.indexOf(users_code);

    console.log(currentSheetsData[code_index]);

    console.log(currentSheetsData[code_index][1]);

    if (
        !(
            currentSheetsData[code_index][1] == "" ||
            currentSheetsData[code_index][1] == undefined
        )
    ) {
        response.json({
            status: "Duplicate",
            message: "Sorry, someone has already guessed this code. 🙃",
        });
        return;
    }

    currentSheetsData[code_index][1] = users_name;
    currentSheetsData[code_index][2] = users_rollClass;
    writeCodesAndWinners(currentSheetsData);

    response.json({
        status: "Success",
        message: `Congratulations! You were the first person to guess this code. 🎉
        
        You have won ${currentSheetsData[code_index][3]}. 
        
        As a bonus challenge, ${currentSheetsData[code_index][4]}!`,
    });
});

app.get("/get-submitted-code-information", async (request, response) => {
    const currentSheetsData = await getCodesAndWinners();
    const submittedRows = currentSheetsData.filter(
        (row) => !(row[1] == "" || row[1] == undefined)
    );

    const formattedData = submittedRows.map((row) => {
        return {
            code: row[0],
            winner: row[1],
            class: row[2],
            prize: row[3],
            challenge: row[4],
        };
    });

    response.json(formattedData);
});

app.listen(PORT, () => console.log(`listening on port ${PORT}`));
