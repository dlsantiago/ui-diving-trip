const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

const isProduction = process.env.PRODUCTION === 'true';
const apiUrl = process.env.DIVING_API_URL || process.env.API_URL || 'http://localhost:8085';

const envConfigFile = `export const environment = {
    production: ${isProduction},
    apiUrl: '${apiUrl}'
};
`;

const targetPath = path.join(__dirname, '../src/environments/environment.ts');
const targetPathDev = path.join(__dirname, '../src/environments/environment.development.ts');

const environmentsDir = path.join(__dirname, '../src/environments');
if (!fs.existsSync(environmentsDir)) {
    fs.mkdirSync(environmentsDir, { recursive: true });
}

fs.writeFile(targetPath, envConfigFile, function (err) {
    if (err) {
        console.error(err);
    }
    console.log(`Output generated at ${targetPath}`);
});

fs.writeFile(targetPathDev, envConfigFile, function (err) {
    if (err) {
        console.error(err);
    }
    console.log(`Output generated at ${targetPathDev}`);
});
