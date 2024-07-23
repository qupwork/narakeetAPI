import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import https from 'https';

// Configure AWS SDK
const s3Client = new S3Client({
    region: 'eu-central-1'
});

const languageVoiceMap = {
    'EN': 'Bronagh',
    'ES': 'Pilar',
    'FR': 'Brigitte',
    'DE': 'Monika',
    'IT': 'Ornella',
    'BG': 'Desislava',
    'CS': 'Barbora',
    'DA': 'Inger',
    'EL': 'Eleni',
    'ET': 'Pille',
    'FI': 'Saara',
    'GA': 'Aoife',
    'HU': 'Krisztina',
    'HR': 'Jasna',
    'IS': 'Steinunn',
    'LV': 'Kristaps',
    'LT': 'Jurga',
    'MK': 'Nina',
    'MT': 'Corazon',
    'NO': 'Sonja',
    'NL': 'Fransje',
    'PL': 'Magda',
    'PT': 'Ines',
    'RO': 'Alina',
    'SK': 'Zuzana',
    'SL': 'Mojca',
    'SV': 'Hedvig',
    'SR': 'Milica',
    'TR': 'Leyla',
};

const APIKEY = 'TK4jrT4FMk8pPXG3hhLgw4tRIOsHjcQn88R6MId0';

const handler = async (event, context) => {
    const text = event['queryStringParameters']['text'];
    const targetLanguage = event['queryStringParameters']['targetLanguage'];

    const voice = languageVoiceMap[targetLanguage.toUpperCase()];

    if (!voice) {
        return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: { error: 'Unsupported language' }
        };
    }

    const commandGet = new GetObjectCommand({
        Bucket: 'narakeet',
        Key: `audio/${targetLanguage.toUpperCase()}/${text}.m4a`,
    });

    try {
        const response = await s3Client.send(commandGet);
        // The Body object also has 'transformToByteArray' and 'transformToWebStream' methods.
        const data = await response.Body.transformToByteArray();
        const buffer = Buffer.from(data).toString("base64");

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'audio/x-m4a' },
            body: buffer,
            isBase64Encoded: true
        };
    } catch (err) {
        /* Handle */
        /*
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/text' },
            body: err.toString()
        };
        */
    }

    const options = {
        hostname: 'api.narakeet.com',
        path: `/text-to-speech/m4a?voice=${voice}`,
        method: 'POST',
        headers: {
            'accept': 'application/octet-stream',
            'x-api-key': APIKEY,
            'content-type': 'text/plain',
        },
    };

    const httpRequest = (options, text) => {
        return new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
                if (res.statusCode < 200 || res.statusCode >= 300) {
                    return reject(new Error('statusCode=' + res.statusCode));
                }
                const data = [];
                res.on('data', (chunk) => data.push(chunk));
                res.on('end', () => resolve(Buffer.concat(data)));
            });
            req.on('error', (err) => reject(err));
            req.write(text);
            req.end();
        });
    };

    const audioStream = await httpRequest(options, text);

    const uploadParams = {
        Bucket: 'narakeet',
        Key: `audio/${targetLanguage.toUpperCase()}/${text}.m4a`, // Generate unique key for each file
        Body: audioStream,
        ContentType: 'audio/m4a'
    };

    const command = new PutObjectCommand(uploadParams);

    try {
        await s3Client.send(command);
    } catch(err){
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/text' },
            body: err.toString()
        };
    }

    try {
        const response = await s3Client.send(commandGet);
        // The Body object also has 'transformToByteArray' and 'transformToWebStream' methods.
        const data = await response.Body.transformToByteArray();
        const buffer = Buffer.from(data).toString("base64");

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'audio/x-m4a' },
            body: buffer,
            isBase64Encoded: true
        };
    } catch (err) {
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/text' },
            body: err.toString()
        };
    }
};

export { handler };
