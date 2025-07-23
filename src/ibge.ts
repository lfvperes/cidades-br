import * as fs from 'fs';
import * as readline from 'readline';
import * as XLSX from 'xlsx';

const codesUF: Number[] = [];
for (let i = 1; i <= 53; i++) {
    if (fs.existsSync(`assets/${i}.ods`)) {
        codesUF.push(i);
    }
}
console.log(codesUF);

function convertODStoCSV(filePath: string) {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
  
    // This is the magic function that does the conversion
    return XLSX.utils.sheet_to_csv(worksheet);
}

async function countLines(filePath: string) {
    // Create a readable stream from the file
    const fileStream = fs.createReadStream(filePath);

    // Create a readline interface to read the stream line by line
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity // Await \r\n as a single line break
    });
  
    let lineCount = 0;
    // The 'for await...of' loop reads each line from the stream
    for await (const line of rl) {
      lineCount++;
    //   console.log(line[0]);
    }
    return lineCount;
}

// let ind = 1;
// const data = fs.readFileSync(`assets/${codesUF[ind]}.ods`, 'utf8');
// const dataCSV = convertODStoCSV(`assets/${codesUF[ind]}.ods`).split('\n');
// const lineCount = dataCSV.length;
// console.log(lineCount);

const allCityCodes: string[] = [];


// const row = 2;
// const col = 0;
const nameCol = 0;
const codeCol = 1;
const gentCol = 2;
const popCol = 7;
// for (let row = 3; row < dataCSV.length - 15; row++) {
//     console.log(`Cidade: ${dataCSV[row].split(',')[nameCol]}, população: ${dataCSV[row].split(',')[popCol]} ${dataCSV[row].split(',')[gentCol]}s`);
    
// }


var dataCSV;
var cleanDataCSV = [];
var stateName = '';
const header = convertODStoCSV(`assets/${codesUF[0]}.ods`).split('\n')[2]
    .replaceAll(/<\/?span>/g,'') + ',Estado [-]\n';
console.log(`header is ${header}`)
for (const uf in codesUF) {
    dataCSV = convertODStoCSV(`assets/${codesUF[uf]}.ods`).split('\n');
    stateName = dataCSV[0].replace(/ \| Todos os Municípios,+/, '');
    for (let row = 3; row < dataCSV.length - 15; row++) {
        dataCSV[row] += ',' + stateName;
        cleanDataCSV.push(dataCSV[row]);
        allCityCodes.push(dataCSV[row].split(',')[codeCol]);
    }
}

console.log(allCityCodes.length);
// console.log(cleanDataCSV[3427]);

fs.writeFileSync('./cities.csv', header + cleanDataCSV.join('\n'));

const chosenCityIdx = Math.floor(Math.random() * allCityCodes.length) + 1;
console.log(`Número escolhido: ${chosenCityIdx}`);
console.log(`Código da cidade escolhida: ${allCityCodes[chosenCityIdx]}`);

var row = 0;
const chosenUF = allCityCodes[chosenCityIdx].slice(0, 2);
const chosenUFdata = convertODStoCSV(`assets/${chosenUF}.ods`).split('\n');
for (const line in chosenUFdata) {
    if (chosenUFdata[line].split(',')[codeCol] === allCityCodes[chosenCityIdx]) {
        row = Number(line);
    }
}
const stateName2 = chosenUFdata[0].split(',')[0].replace(' \| Todos os Municípios', '');

console.log(`📍 ${chosenUFdata[row].split(',')[nameCol]}, ${stateName2}.\nPopulação: ${chosenUFdata[row].split(',')[popCol]} ${chosenUFdata[row].split(',')[gentCol]}s`);
