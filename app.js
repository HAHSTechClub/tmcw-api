const express = require("express");
const app = express();
const {
    getCodesAndWinners,
    writeCodesAndWinners,
} = require("./googleFunctions.js");

PORT = 3000;

app.get("/", async (request, response) => {
    const users_code = request.query.code;
    const users_name = request.query.name;

    currentSheetsData = await getCodesAndWinners();

    const codes = currentSheetsData.map((a) => a[0]);

    if (!codes.includes(users_code)) {
        response.json({
            status: "Incorrect",
            message: "Incorrect code.",
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
            status: "duplicate",
            message: "Sorry, someone has already guessed this code",
        });
        return;
    }

    currentSheetsData[code_index][1] = users_name;

    writeCodesAndWinners(currentSheetsData);

    response.json({
        status: "success",
        message: `Congratulations! You were the first person to guess this code. You have won ${currentSheetsData[code_index][2]}. As a bonus challenge, ${currentSheetsData[code_index][3]}!`,
    });
});

app.listen(PORT, () => console.log(`listening on port ${PORT}`));
