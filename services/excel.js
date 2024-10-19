const moment = require ('moment')
const { GoogleSpreadsheet } = require('google-spreadsheet');
require("dotenv").config();
const SHEET_ID = process.env.SHEET_ID;
const { JWT } = require ('google-auth-library');
let getHomepage = async (req, res) => {
    return res.render("homepage.ejs");
};

let DatBanGGSheet = async (psid, name , time , phone ,req, res) => {
    try {

        let currentDate = new Date();

        const format = "HH:mm DD/MM/YYYY"

        let formatedDate = moment(currentDate).format(format);

        // Initialize the sheet - doc ID is the long id in the sheets URL
      

        const serviceAccountAuth = new JWT({
            // env var values here are copied from service account credentials generated by google
            // see "Authentication" section in docs for more info
            email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
          });
        const doc = new GoogleSpreadsheet(SHEET_ID,serviceAccountAuth)
        await doc.loadInfo(); // loads document properties and worksheets
      
          console.log(time);
         // or use `doc.sheetsById[id]` or `doc.sheetsByTitle[title]`
        const sheet = doc.sheetsByTitle["DatBan"]; // Replace "DatBan" with your sheet title

        // Add a new row below the existing data (starting after B6:H6)
        await sheet.addRow({
            "ID": psid,                   // Value for column B (new row starting at B7)
            "TIME LOGS": formatedDate,  // Value for column C
            "Tên Đặt Bàn": name,            // Value for column D
            "THỜI GIAN": time,  // Value for column E
            "SĐT": phone,
            "Status" : "Chưa Đến"              // Value for column F
        });
       
    }
    catch (e) {
        console.log(e);
        return res.send('Oops! Something wrongs, check logs console for detail ... ')
    }
}

module.exports = {
    getHomepage: getHomepage,
    DatBanGGSheet: DatBanGGSheet
};