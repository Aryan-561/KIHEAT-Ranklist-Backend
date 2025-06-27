import fs from "fs/promises";
import { spawn } from "child_process";
import { ApiError } from "./ApiError.js";
import { cleanTempFolder } from "./clearTemp.js";

/**
 * Runs the Parser-Senpai Python script to parse an uploaded result PDF.
 *
 * @param {string} filePath - The path to the uploaded PDF file.
 * @returns {Promise<[Object, Object]>} Resolves to an array containing:
 *   - resultData: Parsed student result data from result_output.json.
 *   - schemeData: Parsed scheme data from scheme_output.json.
 * @throws {ApiError} If the Python script fails or JSON files cannot be read.
 

  This function:
 *   1. Spawns a Python process to execute Parser-Senpai.
 *   2. Waits for the process to complete.
 *   3. Reads and parses output JSON files.
 *   4. Resolves with parsed data or rejects with an ApiError.
 */

const runPythonScript = (filePath) => {
    return new Promise((resolve, reject) => {
        const python = spawn("python", [
            "src/Parser-Senpai/ParserSenpai.py",
            "-in",
            filePath,
            "-sp",
            "-os",
            "public/temp/scheme_output.json",
            "-or",
            "public/temp/result_output.json",
        ]);

        let output = "";
        let errorOutput = "";

        python.stdout.on("data", (data) => {
            output += data.toString();
        });

        python.stderr.on("data", (data) => {
            errorOutput += data.toString();
        });

        python.on("close", async (code) => {
            if (code === 0) {
                try {
                    const resultJSON = await fs.readFile(
                        "public/temp/result_output.json",
                        "utf-8"
                    );
                    const schemeJSON = await fs.readFile(
                        "public/temp/scheme_output.json",
                        "utf-8"
                    );

                    const resultData = JSON.parse(resultJSON);
                    const schemeData = JSON.parse(schemeJSON);

                    resolve([resultData, schemeData]);
                } catch (err) {
                    await cleanTempFolder();
                    console.error("Error reading result file:", err);
                    reject(
                        new ApiError(500, "Failed to read parsed result JSON")
                    );
                }
            } else {
                await cleanTempFolder();
                console.error(`Python error: ${errorOutput}`);
                reject(new ApiError(500, "Python script failed"));
            }
        });
    });
};

export { runPythonScript };
