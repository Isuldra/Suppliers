This configuration defines how to run the Context7 MCP tool using `npx`. It specifies the package `@upstash/context7-mcp@latest` and includes the `-y` flag to automatically confirm any prompts during installation or execution.

## Dependency Documentation

### `exceljs`

**TITLE: Reading Excel Files with Streaming Interface in ExcelJS**
DESCRIPTION: Example of using ExcelJS streaming interface to read Excel files. This demonstrates how to create a workbook reader with options and handle various events like worksheet, row, shared-strings, hyperlinks, end, and error events.
SOURCE: https://github.com/exceljs/exceljs/blob/master/README.md#2025-04-11_snippet_62

LANGUAGE: javascript
CODE:

```javascript
const options = {
  sharedStrings: 'emit',
  hyperlinks: 'emit',
  worksheets: 'emit',
};
const workbookReader = new ExcelJS.stream.xlsx.WorkbookReader('./file.xlsx', options);
workbookReader.read();

workbookReader.on('worksheet', (worksheet) => {
  worksheet.on('row', (row) => {});
});

workbookReader.on('shared-strings', (sharedString) => {
  // ...
});

workbookReader.on('hyperlinks', (hyperlinksReader) => {
  // ...
});

workbookReader.on('end', () => {
  // ...
});
workbookReader.on('error', (err) => {
  // ...
});
```

**TITLE: Writing XLSX Files with ExcelJS in JavaScript**
DESCRIPTION: Shows different methods for writing Excel workbooks to XLSX format: writing to a file, writing to a stream, or creating a new buffer containing the workbook data.
SOURCE: https://github.com/exceljs/exceljs/blob/master/README.md#2025-04-11_snippet_57

LANGUAGE: javascript
CODE:

```javascript
// write to a file
const workbook = createAndFillWorkbook();
await workbook.xlsx.writeFile(filename);

// write to a stream
await workbook.xlsx.write(stream);

// write to a new buffer
const buffer = await workbook.xlsx.writeBuffer();
```

**TITLE: Reading XLSX Files with ExcelJS in JavaScript**
DESCRIPTION: Demonstrates different ways to read XLSX files using ExcelJS: from a file, from a stream, from a buffer, or with additional options like ignoring specific nodes for performance optimization.
SOURCE: https://github.com/exceljs/exceljs/blob/master/README.md#2025-04-11_snippet_56

LANGUAGE: javascript
CODE:

```javascript
// read from a file
const workbook = new Excel.Workbook();
await workbook.xlsx.readFile(filename);
// ... use workbook

// read from a stream
const workbook = new Excel.Workbook();
await workbook.xlsx.read(stream);
// ... use workbook

// load from buffer
const workbook = new Excel.Workbook();
await workbook.xlsx.load(data);
// ... use workbook

// using additional options
const workbook = new Excel.Workbook();
await workbook.xlsx.load(data, {
  ignoreNodes: [
    'dataValidations', // ignores the workbook's Data Validations
  ],
});
// ... use workbook
```

**TITLE: Reading CSV Files with ExcelJS in JavaScript**
DESCRIPTION: Demonstrates various ways to read CSV files using ExcelJS, including from a file or stream, with custom date formats, and with custom value parsing. Uses the fast-csv module internally.
SOURCE: https://github.com/exceljs/exceljs/blob/master/README.md#2025-04-11_snippet_58

LANGUAGE: javascript
CODE:

```javascript
// read from a file
const workbook = new Excel.Workbook();
const worksheet = await workbook.csv.readFile(filename);
// ... use workbook or worksheet

// read from a stream
const workbook = new Excel.Workbook();
const worksheet = await workbook.csv.read(stream);
// ... use workbook or worksheet

// read from a file with European Dates
const workbook = new Excel.Workbook();
const options = {
  dateFormats: ['DD/MM/YYYY'],
};
const worksheet = await workbook.csv.readFile(filename, options);
// ... use workbook or worksheet

// read from a file with custom value parsing
const workbook = new Excel.Workbook();
const options = {
  map(value, index) {
    switch (index) {
      case 0:
        // column 1 is string
        return value;
      case 1:
        // column 2 is a date
        return new Date(value);
      case 2:
        // column 3 is JSON of a formula value
        return JSON.parse(value);
      default:
        // the rest are numbers
        return parseFloat(value);
    }
  },
  // https://c2fo.github.io/fast-csv/docs/parsing/options
  parserOptions: {
    delimiter: '\t',
    quote: false,
  },
};
const worksheet = await workbook.csv.readFile(filename, options);
// ... use workbook or worksheet
```

**TITLE: Writing CSV File with ExcelJS in JavaScript**
DESCRIPTION: Demonstrates how to write a CSV file using ExcelJS, including options for date formatting, custom value mapping, and formatter options.
SOURCE: https://github.com/exceljs/exceljs/blob/master/README.md#2025-04-11_snippet_59

LANGUAGE: javascript
CODE:

```javascript
// write to a file
const workbook = createAndFillWorkbook();
await workbook.csv.writeFile(filename);

// write to a stream
// Be careful that you need to provide sheetName or
// sheetId for correct import to csv.
await workbook.csv.write(stream, { sheetName: 'Page name' });

// write to a file with European Date-Times
const workbook = new Excel.Workbook();
const options = {
  dateFormat: 'DD/MM/YYYY HH:mm:ss',
  dateUTC: true, // use utc when rendering dates
};
await workbook.csv.writeFile(filename, options);

// write to a file with custom value formatting
const workbook = new Excel.Workbook();
const options = {
  map(value, index) {
    switch (index) {
      case 0:
        // column 1 is string
        return value;
      case 1:
        // column 2 is a date
        return dayjs(value).format('YYYY-MM-DD');
      case 2:
        // column 3 is a formula, write just the result
        return value.result;
      default:
        // the rest are numbers
        return value;
    }
  },
  // https://c2fo.github.io/fast-csv/docs/formatting/options
  formatterOptions: {
    delimiter: '\t',
    quote: false,
  },
};
await workbook.csv.writeFile(filename, options);

// write to a new buffer
const buffer = await workbook.csv.writeBuffer();
```

**TITLE: Streaming XLSX Reader with ExcelJS in JavaScript**
DESCRIPTION: Demonstrates how to use the streaming XLSX workbook reader to efficiently read large Excel files. It includes examples of iterating over worksheets and rows.
SOURCE: https://github.com/exceljs/exceljs/blob/master/README.md#2025-04-11_snippet_61

LANGUAGE: javascript
CODE:

```javascript
const workbookReader = new ExcelJS.stream.xlsx.WorkbookReader('./file.xlsx');
for await (const worksheetReader of workbookReader) {
  for await (const row of worksheetReader) {
    // ...
  }
}

const options = {
  sharedStrings: 'emit',
  hyperlinks: 'emit',
  worksheets: 'emit',
};
const workbook = new ExcelJS.stream.xlsx.WorkbookReader('./file.xlsx', options);
for await (const { eventType, value } of workbook.parse()) {
  switch (eventType) {
    case 'shared-strings':
    // value is the shared string
    case 'worksheet':
    // value is the worksheetReader
    case 'hyperlinks':
    // value is the hyperlinksReader
  }
}
```

**TITLE: Workbook Creation and Properties**
DESCRIPTION: Creating a new workbook and setting its properties including dates and calculation options.
SOURCE: https://github.com/exceljs/exceljs/blob/master/README.md#2025-04-11_snippet_5

LANGUAGE: javascript
CODE:

```javascript
const workbook = new ExcelJS.Workbook();

workbook.creator = 'Me';
workbook.lastModifiedBy = 'Her';
workbook.created = new Date(1985, 8, 30);
workbook.modified = new Date();
workbook.lastPrinted = new Date(2016, 9, 27);
```

LANGUAGE: javascript
CODE:

```javascript
workbook.properties.date1904 = true;
```

LANGUAGE: javascript
CODE:

```javascript
workbook.calcProperties.fullCalcOnLoad = true;
```

**TITLE: Adding Images to Excel Workbook Using Various Sources in JavaScript**
DESCRIPTION: Demonstrates how to add images to an Excel workbook from different sources: a file path, a buffer, or a base64 string. The function returns an imageId that can be used to place the image in worksheets.
SOURCE: https://github.com/exceljs/exceljs/blob/master/README.md#2025-04-11_snippet_48

LANGUAGE: javascript
CODE:

```javascript
// add image to workbook by filename
const imageId1 = workbook.addImage({
  filename: 'path/to/image.jpg',
  extension: 'jpeg',
});

// add image to workbook by buffer
const imageId2 = workbook.addImage({
  buffer: fs.readFileSync('path/to.image.png'),
  extension: 'png',
});

// add image to workbook by base64
const myBase64Image = 'data:image/png;base64,iVBORw0KG...';
const imageId2 = workbook.addImage({
  base64: myBase64Image,
  extension: 'png',
});
```

**TITLE: Worksheet Management Operations**
DESCRIPTION: Examples of adding, accessing, and removing worksheets with various configuration options.
SOURCE: https://github.com/exceljs/exceljs/blob/master/README.md#2025-04-11_snippet_6

LANGUAGE: javascript
CODE:

```javascript
const sheet = workbook.addWorksheet('My Sheet');

const sheet1 = workbook.addWorksheet('My Sheet', {
  properties: { tabColor: { argb: 'FFC0000' } },
});

const sheet2 = workbook.addWorksheet('My Sheet', {
  views: [{ showGridLines: false }],
});

const sheet3 = workbook.addWorksheet('My Sheet', {
  views: [{ state: 'frozen', xSplit: 1, ySplit: 1 }],
});

const sheet4 = workbook.addWorksheet('My Sheet', {
  headerFooter: { firstHeader: 'Hello Exceljs', firstFooter: 'Hello World' },
});

const worksheet = workbook.addWorksheet('My Sheet', {
  pageSetup: { paperSize: 9, orientation: 'landscape' },
});
```

LANGUAGE: javascript
CODE:

```javascript
workbook.eachSheet(function (worksheet, sheetId) {
  // ...
});

const worksheet1 = workbook.getWorksheet('My Sheet');

const worksheet2 = workbook.getWorksheet(1);

workbook.worksheets[0];
```

**TITLE: Installing ExcelJS via npm**
DESCRIPTION: Command to install the ExcelJS library using npm package manager. This is the primary method to add the library to your project dependencies.
SOURCE: https://github.com/exceljs/exceljs/blob/master/README.md#2025-04-11_snippet_0

LANGUAGE: shell
CODE:

```shell
npm install exceljs
```

**TITLE: Importing ExcelJS Module**
DESCRIPTION: Basic import of the ExcelJS library in Node.js environment.
SOURCE: https://github.com/exceljs/exceljs/blob/master/README.md#2025-04-11_snippet_1

LANGUAGE: javascript
CODE:

```javascript
const ExcelJS = require('exceljs');
```

**TITLE: Browserify Bundle Integration**
DESCRIPTION: HTML script tags for including ExcelJS browserified bundles with and without polyfills.
SOURCE: https://github.com/exceljs/exceljs/blob/master/README.md#2025-04-11_snippet_4

LANGUAGE: html
CODE:

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/babel-polyfill/6.26.0/polyfill.js"></script>
<script src="exceljs.js"></script>
```

LANGUAGE: html
CODE:

```html
<script src="--your-project's-pollyfills-here--"></script>
<script src="exceljs.bare.js"></script>
```

**TITLE: Streaming XLSX Writer with ExcelJS in JavaScript**
DESCRIPTION: Shows how to create a streaming XLSX workbook writer, add rows, merge cells, and commit the workbook. This method is more memory-efficient for large workbooks.
SOURCE: https://github.com/exceljs/exceljs/blob/master/README.md#2025-04-11_snippet_60

LANGUAGE: javascript
CODE:

```javascript
// construct a streaming XLSX workbook writer with styles and shared strings
const options = {
  filename: './streamed-workbook.xlsx',
  useStyles: true,
  useSharedStrings: true,
};
const workbook = new Excel.stream.xlsx.WorkbookWriter(options);

worksheet
  .addRow({
    id: i,
    name: theName,
    etc: someOtherDetail,
  })
  .commit();

worksheet.mergeCells('A1:B2');
worksheet.getCell('A1').value = 'I am merged';
worksheet.getCell('C1').value = 'I am not';
worksheet.getCell('C2').value = 'Neither am I';
worksheet.getRow(2).commit(); // now rows 1 and two are committed.

// Finished adding data. Commit the worksheet
worksheet.commit();

// Finished the workbook.
await workbook.commit();
// ... the stream has been written
```

**TITLE: Handling Individual Cells in ExcelJS**
DESCRIPTION: Shows how to access, modify, and query individual cells in an ExcelJS worksheet. Demonstrates getting cell values, changing cell content, and accessing different cell property formats.
SOURCE: https://github.com/exceljs/exceljs/blob/master/README.md#2025-04-11_snippet_17

LANGUAGE: javascript
CODE:

```javascript
const cell = worksheet.getCell('C3');

// Modify/Add individual cell
cell.value = new Date(1968, 5, 1);

// query a cell's type
expect(cell.type).toEqual(Excel.ValueType.Date);

// use string value of cell
myInput.value = cell.text;

// use html-safe string for rendering...
const html = '<div>' + cell.html + '</div>';
```

**TITLE: Setting Cell Values to Null in ExcelJS**
DESCRIPTION: Example of setting a cell value to null in ExcelJS, which indicates the absence of a value and typically won't be stored when written to file except for merged cells.
SOURCE: https://github.com/exceljs/exceljs/blob/master/README.md#2025-04-11_snippet_63

LANGUAGE: javascript
CODE:

```javascript
worksheet.getCell('A1').value = null;
```

**TITLE: Managing Columns in ExcelJS**
DESCRIPTION: Comprehensive example of column operations including defining headers, accessing columns, setting properties, and manipulating column data.
SOURCE: https://github.com/exceljs/exceljs/blob/master/README.md#2025-04-11_snippet_14

LANGUAGE: javascript
CODE:

```javascript
worksheet.columns = [
  { header: 'Id', key: 'id', width: 10 },
  { header: 'Name', key: 'name', width: 32 },
  { header: 'D.O.B.', key: 'DOB', width: 10, outlineLevel: 1 },
];

const idCol = worksheet.getColumn('id');
const nameCol = worksheet.getColumn('B');
const dobCol = worksheet.getColumn(3);

dobCol.header = 'Date of Birth';
dobCol.header = ['Date of Birth', 'A.K.A. D.O.B.'];
dobCol.key = 'dob';
dobCol.width = 15;
dobCol.hidden = true;

worksheet.getColumn(4).outlineLevel = 0;
worksheet.getColumn(5).outlineLevel = 1;

expect(worksheet.getColumn(4).collapsed).to.equal(false);
expect(worksheet.getColumn(5).collapsed).to.equal(true);

dobCol.eachCell(function (cell, rowNumber) {});

dobCol.eachCell({ includeEmpty: true }, function (cell, rowNumber) {});

worksheet.getColumn(6).values = [1, 2, 3, 4, 5];
worksheet.getColumn(7).values = [, , 2, 3, , 5, , 7, , , , 11];

worksheet.spliceColumns(3, 2);

const newCol3Values = [1, 2, 3, 4, 5];
const newCol4Values = ['one', 'two', 'three', 'four', 'five'];
worksheet.spliceColumns(3, 1, newCol3Values, newCol4Values);
```

**TITLE: Adding and Removing Table Rows in ExcelJS**
DESCRIPTION: Demonstrates how to remove rows, insert new rows at a specific index, and append rows to a table in ExcelJS. Changes must be committed to take effect.
SOURCE: https://github.com/exceljs/exceljs/blob/master/README.md#2025-04-11_snippet_31

LANGUAGE: javascript
CODE:

```javascript
const table = ws.getTable('MyTable');

// remove first two rows
table.removeRows(0, 2);

// insert new rows at index 5
table.addRow([new Date('2019-08-05'), 5, 'Mid'], 5);

// append new row to bottom of table
table.addRow([new Date('2019-08-10'), 10, 'End']);

// commit the table changes into the sheet
table.commit();
```

**TITLE: Adding and Removing Table Columns in ExcelJS**
DESCRIPTION: Shows how to remove columns and insert new columns with data at a specific index in ExcelJS. Changes must be committed to take effect.
SOURCE: https://github.com/exceljs/exceljs/blob/master/README.md#2025-04-11_snippet_32

LANGUAGE: javascript
CODE:

```javascript
const table = ws.getTable('MyTable');

// remove second column
table.removeColumns(1, 1);

// insert new column (with data) at index 1
table.addColumn(
  {
    name: 'Letter',
    totalsRowFunction: 'custom',
    totalsRowFormula: 'ROW()',
    totalsRowResult: 6,
    filterButton: true,
  },
  ['a', 'b', 'c', 'd'],
  2
);

// commit the table changes into the sheet
table.commit();
```

**TITLE: Creating Slave Shared Formula in ExcelJS**
DESCRIPTION: Example of assigning a shared formula to a slave cell in ExcelJS by referencing a master cell's formula.
SOURCE: https://github.com/exceljs/exceljs/blob/master/README.md#2025-04-11_snippet_71

LANGUAGE: javascript
CODE:

```javascript
worksheet.getCell('B2').value = { sharedFormula: 'A2', result: 10 };
```

**TITLE: Protecting and Unprotecting Excel Worksheets with JavaScript**
DESCRIPTION: Shows how to add password protection to a worksheet with optional configuration settings, and how to remove protection. Note that the protect() function is async but runs on the main thread.
SOURCE: https://github.com/exceljs/exceljs/blob/master/README.md#2025-04-11_snippet_55

LANGUAGE: javascript
CODE:

```javascript
await worksheet.protect('the-password', options);
```

LANGUAGE: javascript
CODE:

```javascript
worksheet.unprotect();
```

**TITLE: Managing Rows in ExcelJS**
DESCRIPTION: Detailed example of row operations including accessing rows, setting properties, manipulating cell values, and row iteration.
SOURCE: https://github.com/exceljs/exceljs/blob/master/README.md#2025-04-11_snippet_15

LANGUAGE: javascript
CODE:

```javascript
const row = worksheet.getRow(5);
const rows = worksheet.getRows(5, 2);
const row = worksheet.lastRow;

row.height = 42.5;
row.hidden = true;

worksheet.getRow(4).outlineLevel = 0;
worksheet.getRow(5).outlineLevel = 1;

expect(worksheet.getRow(4).collapsed).to.equal(false);
expect(worksheet.getRow(5).collapsed).to.equal(true);

row.getCell(1).value = 5;
row.getCell('name').value = 'Zeb';
row.getCell('C').value = new Date();

row = worksheet.getRow(4).values;
expect(row[5]).toEqual('Kyle');

row.values = [1, 2, 3];
expect(row.getCell(1).value).toEqual(1);
expect(row.getCell(2).value).toEqual(2);
expect(row.getCell(3).value).toEqual(3);

const values = [];
values[5] = 7;
values[10] = 'Hello, World!';
row.values = values;
expect(row.getCell(1).value).toBeNull();
expect(row.getCell(5).value).toEqual(7);
expect(row.getCell(10).value).toEqual('Hello, World!');

row.addPageBreak();

worksheet.eachRow(function (row, rowNumber) {
  console.log('Row ' + rowNumber + ' = ' + JSON.stringify(row.values));
});

worksheet.eachRow({ includeEmpty: true }, function (row, rowNumber) {
  console.log('Row ' + rowNumber + ' = ' + JSON.stringify(row.values));
});

row.eachCell(function (cell, colNumber) {
  console.log('Cell ' + colNumber + ' = ' + cell.value);
});

row.eachCell({ includeEmpty: true }, function (cell, colNumber) {
  console.log('Cell ' + colNumber + ' = ' + cell.value);
});

row.commit();

const rowSize = row.cellCount;
const numValues = row.actualCellCount;
```

### `date-fns`

**TITLE: Implementing index.js for a New Locale in date-fns**
DESCRIPTION: This snippet shows how to create the index.js file for a new locale in date-fns. It includes importing necessary functions, setting locale metadata, and exporting the locale object.
SOURCE: https://github.com/date-fns/date-fns/blob/main/docs/i18nContributionGuide.md#2025-04-17_snippet_0

LANGUAGE: javascript
CODE:

```javascript
import formatDistance from './_lib/formatDistance/index.js';
import formatLong from './_lib/formatLong/index.js';
import formatRelative from './_lib/formatRelative/index.js';
import localize from './_lib/localize/index.js';
import match from './_lib/match/index.js';

/**
 * @type {Locale}
 * @category Locales
 *
 * // Name of the locale.
 * // Inside the parentheses - name of the country - if the locale uses the four letter code, e.g. en-US, fr-CA or pt-BR.
 * @summary English locale (United States).
 *
 * // Name of the language (used by https://date-fns.org/ website)
 * @language English
 *
 * // ISO 639-2 code. See the list here:
 * // https://www.loc.gov/standards/iso639-2/php/code_list.php
 * // Used by https://date-fns.org/ to detect the list of the countries that uses the language.
 * @iso-639-2 eng
 *
 * // Authors of the locale (including anyone who corrected or fixed the locale)
 * @author Sasha Koss [@kossnocorp]{@link https://github.com/kossnocorp}
 * @author Lesha Koss [@leshakoss]{@link https://github.com/leshakoss}
 */
var locale = {
  code: 'en',
  formatDistance: formatDistance,
  formatLong: formatLong,
  formatRelative: formatRelative,
  localize: localize,
  match: match,
  options: {
    // Index of the first day of the week.
    // Sunday is 0, Monday is 1, Saturday is 6.
    weekStartsOn: 0,

    // Nth of January which is always in the first week of the year. See:
    // https://en.wikipedia.org/wiki/Week#The_ISO_week_date_system
    // http://www.pjh2.de/datetime/weeknumber/wnd.php?l=en
    firstWeekContainsDate: 1,
  },
};

export default locale;
```

**TITLE: Importing and Using date-fns for Date Formatting and Comparison in JavaScript**
DESCRIPTION: This example demonstrates how to import specific functions from date-fns, format a date in 'yyyy-MM-dd' pattern, and sort an array of dates in ascending order using the compareAsc function.
SOURCE: https://github.com/date-fns/date-fns/blob/main/README.md#2025-04-17_snippet_0

LANGUAGE: javascript
CODE:

```javascript
import { compareAsc, format } from 'date-fns';

format(new Date(2014, 1, 11), 'yyyy-MM-dd');
//=> '2014-02-11'

const dates = [new Date(1995, 6, 2), new Date(1987, 1, 11), new Date(1989, 6, 10)];
dates.sort(compareAsc);
//=> [
//   Wed Feb 11 1987 00:00:00,
//   Mon Jul 10 1989 00:00:00,
//   Sun Jul 02 1995 00:00:00
// ]
```

**TITLE: Creating an en-GB Locale by Extending en-US in date-fns**
DESCRIPTION: This example demonstrates how to create a new locale (en-GB) by reusing components from an existing locale (en-US) while only implementing unique properties. The implementation imports shared formatting functions from en-US and adds GB-specific formatting and options.
SOURCE: https://github.com/date-fns/date-fns/blob/main/docs/i18nContributionGuide.md#2025-04-17_snippet_22

LANGUAGE: javascript
CODE:

```javascript
// Same as en-US
import formatDistance from '../en-US/_lib/formatDistance/index.js';
import formatRelative from '../en-US/_lib/formatRelative/index.js';
import localize from '../en-US/_lib/localize/index.js';
import match from '../en-US/_lib/match/index.js';

// Unique for en-GB
import formatLong from './_lib/formatLong/index.js';

/**
 * @type {Locale}
 * @category Locales
 * @summary English locale (United Kingdom).
 * @language English
 * @iso-639-2 eng
 * @author John Doe [@example]{@link https://github.com/example}
 */
var locale = {
  formatDistance: formatDistance,
  formatLong: formatLong,
  formatRelative: formatRelative,
  localize: localize,
  match: match,

  // Unique for en-GB
  options: {
    weekStartsOn: 1,
    firstWeekContainsDate: 4,
  },
};

export default locale;
```

**TITLE: Importing Functions from date-fns Submodules in JavaScript**
DESCRIPTION: This snippet shows how to import functions from the main date-fns module and its FP (functional programming) submodule.
SOURCE: https://github.com/date-fns/date-fns/blob/main/docs/gettingStarted.md#2025-04-17_snippet_1

LANGUAGE: javascript
CODE:

```javascript
// The main submodule:
import { addDays } from 'date-fns';

// FP variation:
import { addDays, format } from 'date-fns/fp';
```

**TITLE: Creating a Locale-Aware Format Wrapper for date-fns**
DESCRIPTION: Shows how to create a wrapper function that simplifies locale switching when formatting dates. The wrapper imports multiple locales, stores the current locale in a global variable, and applies it automatically to all date formatting operations.
SOURCE: https://github.com/date-fns/date-fns/blob/main/docs/i18n.md#2025-04-17_snippet_1

LANGUAGE: javascript
CODE:

```javascript
// app/_lib/format.js

import { format } from 'date-fns';
import { enGB, eo, ru } from 'date-fns/locale';

const locales = { enGB, eo, ru };

// by providing a default string of 'PP' or any of its variants for `formatStr`
// it will format dates in whichever way is appropriate to the locale
export default function (date, formatStr = 'PP') {
  return format(date, formatStr, {
    locale: locales[window.__localeId__], // or global.__localeId__
  });
}

// Later:

import format from 'app/_lib/format';

window.__localeId__ = 'enGB';
format(friday13, 'EEEE d');
//=> 'Friday 13'

window.__localeId__ = 'eo';
format(friday13, 'EEEE d');
//=> 'vendredo 13'

// If the format string is omitted, it will take the default for the locale.
window.__localeId__ = 'enGB';
format(friday13);
//=> Jul 13, 2019

window.__localeId__ = 'eo';
format(friday13);
//=> 2019-jul-13
```

**TITLE: Using formatDistance and subDays Functions from date-fns in JavaScript**
DESCRIPTION: This snippet shows how to import and use the formatDistance and subDays functions from date-fns to calculate and format the difference between two dates.
SOURCE: https://github.com/date-fns/date-fns/blob/main/docs/gettingStarted.md#2025-04-17_snippet_3

LANGUAGE: javascript
CODE:

```javascript
import { formatDistance, subDays } from 'date-fns';

formatDistance(subDays(new Date(), 3), new Date(), { addSuffix: true });
//=> "3 days ago"
```

**TITLE: Formatting and Comparing Dates with date-fns in JavaScript**
DESCRIPTION: This snippet demonstrates how to use the format and compareAsc functions from date-fns to format a date and sort an array of dates in ascending order.
SOURCE: https://github.com/date-fns/date-fns/blob/main/docs/gettingStarted.md#2025-04-17_snippet_0

LANGUAGE: javascript
CODE:

```javascript
import { format, compareAsc } from 'date-fns';

format(new Date(2014, 1, 11), 'MM/dd/yyyy');
//=> '02/11/2014'

const dates = [new Date(1995, 6, 2), new Date(1987, 1, 11), new Date(1989, 6, 10)];
dates.sort(compareAsc);
//=> [
//   Wed Feb 11 1987 00:00:00,
//   Mon Jul 10 1989 00:00:00,
//   Sun Jul 02 1995 00:00:00
// ]
```

**TITLE: Formatting Relative Date Representations**
DESCRIPTION: Generates human-readable relative date strings based on proximity to a reference date
SOURCE: https://github.com/date-fns/date-fns/blob/main/src/locale/en-US/snapshot.md#2025-04-17_snippet_3

LANGUAGE: markdown
CODE:

```
## `formatRelative`

If now is January 1st, 2000, 00:00.
```

**TITLE: Installing date-fns via npm**
DESCRIPTION: This snippet shows the npm command to install date-fns as a project dependency. The --save flag ensures the dependency is added to package.json.
SOURCE: https://github.com/date-fns/date-fns/blob/main/README.md#2025-04-17_snippet_1

LANGUAGE: bash
CODE:

```
npm install date-fns --save
```

**TITLE: Using TZDate Extension with date-fns Functions**
DESCRIPTION: Demonstrates how to use TZDate extension to handle DST transitions correctly across different time zones. Shows the difference between system time zone and specified time zone behavior.
SOURCE: https://github.com/date-fns/date-fns/blob/main/docs/timeZones.md#2025-04-17_snippet_0

LANGUAGE: typescript
CODE:

```
import { TZDate } from "@date-fns/tz";
import { addHours } from "date-fns";

// Given that the system time zone is America/Los_Angeles
// where DST happens on Sunday, 13 March 2022, 02:00:00

// Using the system time zone will produce 03:00 instead of 02:00 because of DST:
const date = new Date(2022, 2, 13);
addHours(date, 2).toString();
//=> 'Sun Mar 13 2022 03:00:00 GMT-0700 (Pacific Daylight Time)'

// Using Asia/Singapore will provide the expected 02:00:
const tzDate = new TZDate(2022, 2, 13, "Asia/Singapore");
addHours(tzDate, 2).toString();
//=> 'Sun Mar 13 2022 02:00:00 GMT+0800 (Singapore Standard Time)'
```

**TITLE: Transposing Date Values Between Time Zones**
DESCRIPTION: Shows how to transpose date values between different time zones while maintaining the same local time using the transpose function.
SOURCE: https://github.com/date-fns/date-fns/blob/main/docs/timeZones.md#2025-04-17_snippet_4

LANGUAGE: typescript
CODE:

```
import { transpose } from "date-fns";
import { tz } from "@date-fns/tz";

// Singapore is the system time zone:
const sgDate = new Date(2024, 8 /* Sep */, 7, 6, 5, 4);
//=> 'Wed Sep 07 2024 06:05:04 GMT+0800 (Singapore Standard Time)'

// Transpose the date to Los Angeles time zone:
const laDate = transpose(sgDate, tz("America/Los_Angeles"));
//=> 'Wed Sep 07 2024 06:05:04 GMT-0700 (Pacific Daylight Time)'

// Transpose back to local time zone using Date:
const systemDate = transpose(laDate, Date);
//=> 'Wed Sep 07 2024 06:05:04 GMT+0800 (Singapore Standard Time)'
```

**TITLE: Matching Localized Values (en-US)**
DESCRIPTION: This snippet defines the `match` object for the `en-US` locale, used by the `parse` function. It includes regular expressions and utility functions for matching and parsing ordinal numbers, eras, quarters, months, days, and day periods. The `buildMatchPatternFn` and `buildMatchFn` functions are assumed to be imported from other modules within the library.
SOURCE: https://github.com/date-fns/date-fns/blob/main/docs/i18nContributionGuide.md#2025-04-17_snippet_15

LANGUAGE: javascript
CODE:

```js
// In `en-US` locale:
import buildMatchPatternFn from '../../../_lib/buildMatchPatternFn/index.js';
import buildMatchFn from '../../../_lib/buildMatchFn/index.js';

var matchOrdinalNumberPattern = /^(\d+)(th|st|nd|rd)?/i;
var parseOrdinalNumberPattern = /\d+/i;

var matchEraPatterns = {
  narrow: /^(b|a)/i,
  abbreviated: /^(b\.?\s?c\.?|b\.?\s?c\.?\s?e\.?|a\.?\s?d\.?|c\.?\s?e\.?)/i,
  wide: /^(before christ|before common era|anno domini|common era)/i,
};
var parseEraPatterns = {
  any: [/^b/i, /^(a|c)/i],
};

var matchQuarterPatterns = {
  narrow: /^[1234]/i,
  abbreviated: /^q[1234]/i,
  wide: /^[1234](th|st|nd|rd)? quarter/i,
};
var parseQuarterPatterns = {
  any: [/1/i, /2/i, /3/i, /4/i],
};

var matchMonthPatterns = {
  narrow: /^[jfmasond]/i,
  abbreviated: /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i,
  wide: /^(january|february|march|april|may|june|july|august|september|october|november|december)/i,
};
var parseMonthPatterns = {
  narrow: [/^j/i, /^f/i, /^m/i, /^a/i, /^m/i, /^j/i, /^j/i, /^a/i, /^s/i, /^o/i, /^n/i, /^d/i],
  any: [
    /^ja/i,
    /^f/i,
    /^mar/i,
    /^ap/i,
    /^may/i,
    /^jun/i,
    /^jul/i,
    /^au/i,
    /^s/i,
    /^o/i,
    /^n/i,
    /^d/i,
  ],
};

var matchDayPatterns = {
  narrow: /^[smtwf]/i,
  short: /^(su|mo|tu|we|th|fr|sa)/i,
  abbreviated: /^(sun|mon|tue|wed|thu|fri|sat)/i,
  wide: /^(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/i,
};
var parseDayPatterns = {
  narrow: [/^s/i, /^m/i, /^t/i, /^w/i, /^t/i, /^f/i, /^s/i],
  any: [/^su/i, /^m/i, /^tu/i, /^w/i, /^th/i, /^f/i, /^sa/i],
};

var matchDayPeriodPatterns = {
  narrow: /^(a|p|mi|n|(in the|at) (morning|afternoon|evening|night))/i,
  any: /^([ap]\.?\s?m\.?|midnight|noon|(in the|at) (morning|afternoon|evening|night))/i,
};
var parseDayPeriodPatterns = {
  any: {
    am: /^a/i,
    pm: /^p/i,
    midnight: /^mi/i,
    noon: /^no/i,
    morning: /morning/i,
    afternoon: /afternoon/i,
    evening: /evening/i,
    night: /night/i,
  },
};

var match = {
  ordinalNumber: buildMatchPatternFn({
    matchPattern: matchOrdinalNumberPattern,
    parsePattern: parseOrdinalNumberPattern,
    valueCallback: function (value) {
      return parseInt(value, 10);
    },
  }),

  era: buildMatchFn({
    matchPatterns: matchEraPatterns,
    defaultMatchWidth: 'wide',
    parsePatterns: parseEraPatterns,
    defaultParseWidth: 'any',
  }),

  quarter: buildMatchFn({
    matchPatterns: matchQuarterPatterns,
    defaultMatchWidth: 'wide',
    parsePatterns: parseQuarterPatterns,
    defaultParseWidth: 'any',
    valueCallback: function (index) {
      return index + 1;
    },
  }),

  month: buildMatchFn({
    matchPatterns: matchMonthPatterns,
    defaultMatchWidth: 'wide',
    parsePatterns: parseMonthPatterns,
    defaultParseWidth: 'any',
  }),

  day: buildMatchFn({
    matchPatterns: matchDayPatterns,
    defaultMatchWidth: 'wide',
    parsePatterns: parseDayPatterns,
    defaultParseWidth: 'any',
  }),

  dayPeriod: buildMatchFn({
    matchPatterns: matchDayPeriodPatterns,
    defaultMatchWidth: 'any',
    parsePatterns: parseDayPeriodPatterns,
    defaultParseWidth: 'any',
  }),
};

export default match;
```

**TITLE: Comparing Wrong vs Correct Date Formatting in JavaScript**
DESCRIPTION: Demonstrates the correct and incorrect usage of date formatting tokens, specifically contrasting YYYY-MM-DD vs yyyy-MM-dd format patterns and D.MM.YY vs d.MM.yy parsing patterns.
SOURCE: https://github.com/date-fns/date-fns/blob/main/docs/unicodeTokens.md#2025-04-17_snippet_0

LANGUAGE: javascript
CODE:

```javascript
// ❌ Wrong!
format(new Date(), 'YYYY-MM-DD');
//=> 2018-10-283

// ✅ Correct
format(new Date(), 'yyyy-MM-dd');
//=> 2018-10-10

// ❌ Wrong!
parse('11.02.87', 'D.MM.YY', new Date()).toString();
//=> 'Sat Jan 11 1986 00:00:00 GMT+0200 (EET)'

// ✅ Correct
parse('11.02.87', 'd.MM.yy', new Date()).toString();
//=> 'Wed Feb 11 1987 00:00:00 GMT+0200 (EET)'
```

**TITLE: Implementing era Localization Function for en-US Locale in date-fns**
DESCRIPTION: This snippet demonstrates how to implement the era localization function for the en-US locale in date-fns using the buildLocalizeFn helper function.
SOURCE: https://github.com/date-fns/date-fns/blob/main/docs/i18nContributionGuide.md#2025-04-17_snippet_3

LANGUAGE: javascript
CODE:

```javascript
// In `en-US` locale:
import buildLocalizeFn from '../../../_lib/buildLocalizeFn/index.js';

var eraValues = {
  narrow: ['B', 'A'],
  abbreviated: ['BC', 'AD'],
  wide: ['Before Christ', 'Anno Domini'],
};

var localize = {
  // ...
  era: buildLocalizeFn({
    values: eraValues,
    defaultWidth: 'wide',
  }),
  // ...
};

export default localize;
```

**TITLE: Mixing Different Time Zone Date Objects**
DESCRIPTION: Shows how to work with multiple date objects in different time zones for business day calculations. Demonstrates how date-fns normalizes arguments based on the reference type.
SOURCE: https://github.com/date-fns/date-fns/blob/main/docs/timeZones.md#2025-04-17_snippet_1

LANGUAGE: typescript
CODE:

```
import { TZDate } from "@date-fns/tz";
import { differenceInBusinessDays } from "date-fns";

const laterDate = new TZDate(2025, 0, 1, "Asia/Singapore");
const earlierDate = new TZDate(2024, 0, 1, "America/New_York");

// Will calculate in Asia/Singapore
differenceInBusinessDays(laterDate, earlierDate);
//=> 262

// Will calculate in America/New_York
differenceInBusinessDays(earlierDate, laterDate);
//=> -261
```

**TITLE: Using Locales with date-fns formatDistance Function**
DESCRIPTION: Demonstrates how to import and use a specific locale (Esperanto) with the formatDistance function. Shows how to pass the locale as an option to properly format date differences in different languages.
SOURCE: https://github.com/date-fns/date-fns/blob/main/docs/i18n.md#2025-04-17_snippet_0

LANGUAGE: javascript
CODE:

```javascript
import { formatDistance } from 'date-fns';
// Require Esperanto locale
import { eo } from 'date-fns/locale';

const result = formatDistance(
  new Date(2016, 7, 1),
  new Date(2015, 0, 1),
  { locale: eo } // Pass the locale as an option
);
//=> 'pli ol 1 jaro'
```

### `@tanstack/react-table`

**TITLE: Initializing a Table with createSvelteTable in Svelte**
DESCRIPTION: This snippet demonstrates the basic usage of createSvelteTable function from the @tanstack/svelte-table package. It imports the necessary function and creates a table instance by passing options to it, which will handle state management in a Svelte-compatible way.
SOURCE: https://github.com/TanStack/table/blob/main/docs/framework/svelte/svelte-table.md#2025-04-19_snippet_0

LANGUAGE: svelte
CODE:

```svelte
<script>

import { createSvelteTable } from '@tanstack/svelte-table'

const table = createSvelteTable(options)

</script>
```

**TITLE: Generating Angular Components and Other Artifacts**
DESCRIPTION: Uses Angular CLI to generate new components, directives, pipes, services, classes, guards, interfaces, enums, or modules.
SOURCE: https://github.com/TanStack/table/blob/main/examples/angular/basic/README.md#2025-04-19_snippet_1

LANGUAGE: bash
CODE:

```bash
ng generate component component-name
```

**TITLE: Generating Angular Components and Other Artifacts**
DESCRIPTION: Uses Angular CLI to generate new components, directives, pipes, services, classes, guards, interfaces, enums, or modules. Replace 'component-name' with the desired name of your component.
SOURCE: https://github.com/TanStack/table/blob/main/examples/angular/column-resizing-performant/README.md#2025-04-19_snippet_1

LANGUAGE: bash
CODE:

```bash
ng generate component component-name
```

**TITLE: Generating Angular Components and Other Artifacts**
DESCRIPTION: Uses Angular CLI to generate new components, directives, pipes, services, classes, guards, interfaces, enums, or modules. This command scaffolds the basic structure for the specified artifact type.
SOURCE: https://github.com/TanStack/table/blob/main/examples/angular/sub-components/README.md#2025-04-19_snippet_1

LANGUAGE: shell
CODE:

```shell
ng generate component component-name
```

LANGUAGE: shell
CODE:

```shell
ng generate directive|pipe|service|class|guard|interface|enum|module
```

**TITLE: Generating Angular Components**
DESCRIPTION: Angular CLI command for generating new components and other Angular artifacts like directives, pipes, services, etc.
SOURCE: https://github.com/TanStack/table/blob/main/examples/angular/expanding/README.md#2025-04-19_snippet_1

LANGUAGE: bash
CODE:

```bash
ng generate component component-name
```

**TITLE: Initializing a React Table with useReactTable Hook**
DESCRIPTION: Demonstrates how to import and use the useReactTable hook from the @tanstack/react-table package. This hook takes an options object and returns a table instance that can be used for rendering a data table.
SOURCE: https://github.com/TanStack/table/blob/main/docs/framework/react/react-table.md#2025-04-19_snippet_0

LANGUAGE: tsx
CODE:

```tsx
import { useReactTable } from '@tanstack/react-table';

function App() {
  const table = useReactTable(options);

  // ...render your table
}
```

**TITLE: Accessing Angular CLI Help**
DESCRIPTION: Displays help information for Angular CLI commands and options. This command provides quick access to documentation and usage instructions for the CLI.
SOURCE: https://github.com/TanStack/table/blob/main/examples/angular/sub-components/README.md#2025-04-19_snippet_5

LANGUAGE: shell
CODE:

```shell
ng help
```

**TITLE: Accessing Angular CLI Help**
DESCRIPTION: Command to get help information about Angular CLI usage and commands.
SOURCE: https://github.com/TanStack/table/blob/main/examples/angular/column-pinning-sticky/README.md#2025-04-19_snippet_5

LANGUAGE: bash
CODE:

```bash
ng help
```

**TITLE: Accessing Angular CLI Help**
DESCRIPTION: Displays help information for Angular CLI. This command provides quick access to documentation and usage instructions for Angular CLI commands.
SOURCE: https://github.com/TanStack/table/blob/main/examples/angular/column-pinning/README.md#2025-04-19_snippet_5

LANGUAGE: shell
CODE:

```shell
ng help
```

**TITLE: Accessing Angular CLI Help**
DESCRIPTION: Provides access to the Angular CLI help documentation, offering guidance on various CLI commands and their usage.
SOURCE: https://github.com/TanStack/table/blob/main/examples/angular/filters/README.md#2025-04-19_snippet_5

LANGUAGE: bash
CODE:

```bash
ng help
```

**TITLE: Adding a Global Filter Input UI for React Table**
DESCRIPTION: Implements a search input that connects to the table's setGlobalFilter method, allowing users to enter search terms that filter all columns of the table simultaneously.
SOURCE: https://github.com/TanStack/table/blob/main/docs/guide/global-filtering.md#2025-04-19_snippet_5

LANGUAGE: jsx
CODE:

```jsx
return (
  <div>
    <input
      value=""
      onChange={(e) => table.setGlobalFilter(String(e.target.value))}
      placeholder="Search..."
    />
  </div>
);
```

**TITLE: Generating Angular Components and Other Artifacts**
DESCRIPTION: Angular CLI command for generating new components, directives, pipes, services, classes, guards, interfaces, enums, or modules.
SOURCE: https://github.com/TanStack/table/blob/main/examples/angular/column-ordering/README.md#2025-04-19_snippet_1

LANGUAGE: Shell
CODE:

```shell
ng generate component component-name
```

**TITLE: Generating Angular Components**
DESCRIPTION: Angular CLI command for generating new components and other Angular artifacts like directives, pipes, services, etc
SOURCE: https://github.com/TanStack/table/blob/main/examples/angular/signal-input/README.md#2025-04-19_snippet_1

LANGUAGE: bash
CODE:

```bash
ng generate component component-name
```

**TITLE: Table API - getToggleAllPageRowsSelectedHandler**
DESCRIPTION: Returns a handler function that toggles selection for all rows on the current page. Useful for paginated tables where you only want to select visible rows.
SOURCE: https://github.com/TanStack/table/blob/main/docs/api/features/row-selection.md#2025-04-19_snippet_6

LANGUAGE: tsx
CODE:

```tsx
getToggleAllPageRowsSelectedHandler: () => (event: unknown) => void
```

**TITLE: Rendering Table Cells with flexRender in Qwik**
DESCRIPTION: This snippet shows how to use flexRender utility to render cell/header/footer templates with dynamic values in a Qwik table component. It maps through rows and cells to create a table body.
SOURCE: https://github.com/TanStack/table/blob/main/docs/framework/qwik/qwik-table.md#2025-04-19_snippet_1

LANGUAGE: jsx
CODE:

```jsx
import { flexRender } from '@tanstack/qwik-table';
//...
return (
  <tbody>
    {table.getRowModel().rows.map((row) => {
      return (
        <tr key={row.id}>
          {row.getVisibleCells().map((cell) => (
            <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
          ))}
        </tr>
      );
    })}
  </tbody>
);
```

**TITLE: Specifying a Global Filter Function in React Table**
DESCRIPTION: Configures a table instance with a specific global filter function, in this case using the built-in 'text' filter function for case-insensitive text search across all columns.
SOURCE: https://github.com/TanStack/table/blob/main/docs/guide/global-filtering.md#2025-04-19_snippet_2

LANGUAGE: jsx
CODE:

```jsx
const table = useReactTable({
  data,
  columns,
  getCoreRowModel: getCoreRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
  globalFilterFn: 'text', // built-in filter function
});
```

**TITLE: Table API - getToggleAllRowsSelectedHandler**
DESCRIPTION: Returns a handler function that toggles selection for all rows in the table. Useful for implementing select-all functionality in UI components.
SOURCE: https://github.com/TanStack/table/blob/main/docs/api/features/row-selection.md#2025-04-19_snippet_5

LANGUAGE: tsx
CODE:

```tsx
getToggleAllRowsSelectedHandler: () => (event: unknown) => void
```

**TITLE: Generating Angular Components**
DESCRIPTION: Angular CLI command for generating new components and other Angular artifacts like directives, pipes, services, etc.
SOURCE: https://github.com/TanStack/table/blob/main/examples/angular/expanding/README.md#2025-04-19_snippet_1

LANGUAGE: bash
CODE:

```bash
ng generate component component-name
```

**TITLE: Accessing Row Object from Cell in TanStack Table**
DESCRIPTION: A property that provides access to the associated Row object for the cell, allowing access to row-level data and operations.
SOURCE: https://github.com/TanStack/table/blob/main/docs/api/core/cell.md#2025-04-19_snippet_3

LANGUAGE: tsx
CODE:

```tsx
row: Row<TData>;
```

**TITLE: Implementing Fuzzy Filter with Ranking**
DESCRIPTION: Example implementation of a fuzzy filter function using match-sorter-utils, demonstrating filter meta usage and custom sorting based on ranking.
SOURCE: https://github.com/TanStack/table/blob/main/docs/api/features/column-filtering.md#2025-04-19_snippet_2

LANGUAGE: tsx
CODE:

```tsx
import { sortingFns } from '@tanstack/react-table';

import { rankItem, compareItems } from '@tanstack/match-sorter-utils';

const fuzzyFilter = (row, columnId, value, addMeta) => {
  // Rank the item
  const itemRank = rankItem(row.getValue(columnId), value);

  // Store the ranking info
  addMeta(itemRank);

  // Return if the item should be filtered in/out
  return itemRank.passed;
};

const fuzzySort = (rowA, rowB, columnId) => {
  let dir = 0;

  // Only sort by rank if the column has ranking information
  if (rowA.columnFiltersMeta[columnId]) {
    dir = compareItems(rowA.columnFiltersMeta[columnId]!, rowB.columnFiltersMeta[columnId]!);
  }

  // Provide an alphanumeric fallback for when the item ranks are equal
  return dir === 0 ? sortingFns.alphanumeric(rowA, rowB, columnId) : dir;
};
```

**TITLE: Managing Individual Controlled State with Lit**
DESCRIPTION: Shows how to control specific table states (like sorting) in your own state management while letting the table handle other states internally. This uses state and onSortingChange to manage sorting state externally.
SOURCE: https://github.com/TanStack/table/blob/main/docs/framework/lit/guide/table-state.md#2025-04-19_snippet_2

LANGUAGE: jsx
CODE:

```jsx
import {html} from "lit";

@customElement('my-component')
class MyComponent extends LitElement {
  @state()
  private _sorting: SortingState = []

  render() {
    const table = this.tableController.table({
      columns,
      data,
      state: {
        sorting: this._sorting,
      },
      onSortingChange: updaterOrValue => {
        if (typeof updaterOrValue === 'function') {
          this._sorting = updaterOrValue(this._sorting)
        } else {
          this._sorting = updaterOrValue
        }
      },
      getSortedRowModel: getSortedRowModel(),
      getCoreRowModel: getCoreRowModel(),
    })

    return html`...`
  }
}
//...
```

**TITLE: Implementing Individually Controlled State for TanStack Table in Qwik**
DESCRIPTION: Demonstrates controlling specific table state properties (filtering, sorting, and pagination) in your own state management while leaving other state properties to be managed internally. Useful for server-side data fetching scenarios.
SOURCE: https://github.com/TanStack/table/blob/main/docs/framework/qwik/guide/table-state.md#2025-04-19_snippet_2

LANGUAGE: jsx
CODE:

```jsx
const columnFilters = Qwik.useSignal([]); //no default filters
const sorting = Qwik.useSignal([
  {
    id: 'age',
    desc: true, //sort by age in descending order by default
  },
]);
const pagination = Qwik.useSignal({ pageIndex: 0, pageSize: 15 });

//Use our controlled state values to fetch data
const tableQuery = useQuery({
  queryKey: ['users', columnFilters.value, sorting.value, pagination.value],
  queryFn: () => fetchUsers(columnFilters.value, sorting.value, pagination.value),
  //...
});

const table = useQwikTable({
  columns: columns.value,
  data: tableQuery.data,
  //...
  state: {
    columnFilters: columnFilters.value, //pass controlled state back to the table (overrides internal state)
    sorting: sorting.value,
    pagination: pagination.value,
  },
  onColumnFiltersChange: (updater) => {
    columnFilters.value = updater instanceof Function ? updater(columnFilters.value) : updater; //hoist columnFilters state into our own state management
  },
  onSortingChange: (updater) => {
    sorting.value = updater instanceof Function ? updater(sorting.value) : updater;
  },
  onPaginationChange: (updater) => {
    pagination.value = updater instanceof Function ? updater(pagination.value) : updater;
  },
});
//...
```

**TITLE: Accessing Column Object from Cell in TanStack Table**
DESCRIPTION: A property that provides access to the associated Column object for the cell, allowing access to column-level configuration and operations.
SOURCE: https://github.com/TanStack/table/blob/main/docs/api/core/cell.md#2025-04-19_snippet_4

LANGUAGE: tsx
CODE:

```tsx
row: Row<TData>;
```

**TITLE: Render Row Value Method Definition**
DESCRIPTION: Method to render the value from a row for a given column ID, returning a fallback value if no value is found.
SOURCE: https://github.com/TanStack/table/blob/main/docs/api/core/row.md#2025-04-19_snippet_6

LANGUAGE: tsx
CODE:

```tsx
renderValue: (columnId: string) => TValue;
```

**TITLE: Table API - getIsSomePageRowsSelected**
DESCRIPTION: Returns a boolean indicating if some (but not all) rows on the current page are selected. Useful for determining indeterminate checkbox states.
SOURCE: https://github.com/TanStack/table/blob/main/docs/api/features/row-selection.md#2025-04-19_snippet_12

LANGUAGE: tsx
CODE:

```tsx
getIsSomePageRowsSelected: () => boolean;
```

**TITLE: Implementing a Custom Global Filter Function in React Table**
DESCRIPTION: Demonstrates how to create and apply a custom filtering function for global searches, which can be passed to the globalFilterFn option in the table configuration.
SOURCE: https://github.com/TanStack/table/blob/main/docs/guide/global-filtering.md#2025-04-19_snippet_6

LANGUAGE: jsx
CODE:

```jsx
const customFilterFn = (rows, columnId, filterValue) => {
  // custom filter logic
};

const table = useReactTable({
  // other options...
  globalFilterFn: customFilterFn,
});
```

### `nodemailer`

**TITLE: Using Encoded Strings as Attachments in Nodemailer**
DESCRIPTION: Shows how to use encoded strings as attachments by specifying the encoding. This allows including binary attachments in JSON-formatted email objects.
SOURCE: https://github.com/nodemailer/nodemailer/blob/master/CHANGELOG.md#2025-04-22_snippet_6

LANGUAGE: JavaScript
CODE:

```
attachment: {
  encoding: 'base64',
  content: 'SGVsbG8gV29ybGQh'
}
```

---

**TITLE: Using Data URIs as Attachments in Nodemailer**
DESCRIPTION: Demonstrates how to use data URIs as attachment paths in Nodemailer. This allows embedding binary data directly in the email configuration object.
SOURCE: https://github.com/nodemailer/nodemailer/blob/master/CHANGELOG.md#2025-04-22_snippet_5

LANGUAGE: JavaScript
CODE:

```
attachment: {
  path: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg=="
}
```

---

**TITLE: Using Raw MIME Content in Nodemailer Attachments**
DESCRIPTION: Shows how to use pre-prepared MIME content as an attachment using the new 'raw' option. Useful for injecting custom-crafted MIME nodes.
SOURCE: https://github.com/nodemailer/nodemailer/blob/master/CHANGELOG.md#2025-04-22_snippet_8

LANGUAGE: JavaScript
CODE:

```
attachments: [{
  raw: 'Content-Type: text/plain\\r\\n' +
       'Content-Disposition: attachment;\\r\\n\\r\\n' +
       'Hello world!'
}]
```

---

**TITLE: Using Raw MIME Messages in Nodemailer**
DESCRIPTION: Demonstrates how to use an existing MIME message instead of generating a new one, using the 'raw' message option.
SOURCE: https://github.com/nodemailer/nodemailer/blob/master/CHANGELOG.md#2025-04-22_snippet_9

LANGUAGE: JavaScript
CODE:

```
let message = {
  raw: 'From: sender@example.com\\r\\n' +
       'To: receiver@example.com\\r\\n' +
       'Subject: test\\r\\n' +
       '\\r\\n' +
       'Hello world!'
};
```

---

**TITLE: Configuring TLS Options in Nodemailer**
DESCRIPTION: Example configuration for setting up TLS options in Nodemailer with proper security settings. Shows how to set minimum TLS version and certificate validation options.
SOURCE: https://github.com/nodemailer/nodemailer/blob/master/README.md#2025-04-22_snippet_0

LANGUAGE: javascript
CODE:

```
let configOptions = {
    host: "smtp.example.com",
    port: 587,
    tls: {
        rejectUnauthorized: true,
        minVersion: "TLSv1.2"
    }
}
```

---

**TITLE: Configuring Direct IP Connection in Nodemailer**
DESCRIPTION: Example showing how to configure Nodemailer to connect directly to an IP address while maintaining proper TLS certificate validation through the servername option.
SOURCE: https://github.com/nodemailer/nodemailer/blob/master/README.md#2025-04-22_snippet_1

LANGUAGE: javascript
CODE:

```
let configOptions = {
    host: "1.3.1.4",
    port: 465,
    secure: true,
    tls: {
        // must provide server name, otherwise TLS certificate check will fail
        servername: "example.com"
    }
}
```

---

**TITLE: Embedding iCalendar Events in Nodemailer Messages**
DESCRIPTION: Demonstrates how to embed iCalendar events in Nodemailer messages using the new 'icalEvent' option.
SOURCE: https://github.com/nodemailer/nodemailer/blob/master/CHANGELOG.md#2025-04-22_snippet_7

LANGUAGE: JavaScript
CODE:

```
icalEvent: {
  filename: 'invitation.ics',
  method: 'request',
  content: 'BEGIN:VCALENDAR...'
}
```

---

**TITLE: Changelog Entry Format**
DESCRIPTION: Standard changelog format showing version number, date, and changes categorized as Features and Bug Fixes.
SOURCE: https://github.com/nodemailer/nodemailer/blob/master/CHANGELOG.md#2025-04-22_snippet_0

LANGUAGE: markdown
CODE:

```
## [6.10.1](https://github.com/nodemailer/nodemailer/compare/v6.10.0...v6.10.1) (2025-02-06)

### Bug Fixes

* close correct socket ([a18062c](https://github.com/nodemailer/nodemailer/commit/a18062c04d0e05ca4357fbe8f0a59b690fa5391e))
```

---

**TITLE: Bug Fix Entry Format**
DESCRIPTION: Standard format for documenting bug fixes with component name, fix description, and relevant issue/commit references.
SOURCE: https://github.com/nodemailer/nodemailer/blob/master/CHANGELOG.md#2025-04-22_snippet_2

LANGUAGE: markdown
CODE:

```
### Bug Fixes

* **addressparser:** Correctly detect if user local part is attached to domain part ([f2096c5](https://github.com/nodemailer/nodemailer/commit/f2096c51b92a69ecfbcc15884c28cb2c2f00b826))
```

---

**TITLE: Breaking Changes Documentation**
DESCRIPTION: Documentation format for major version changes and breaking changes, exemplified in the v3.0.0 release notes
SOURCE: https://github.com/nodemailer/nodemailer/blob/master/CHANGELOG.md#2025-04-22_snippet_4

LANGUAGE: markdown
CODE:

```
## v3.0.0 2017-01-31

-   Initial version of Nodemailer 3

This update brings a lot of breaking changes:

-   License changed from MIT to **EUPL-1.1**
-   Requires **Node.js v6+**
-   All **templating is gone**
-   **No NTLM authentication**
-   **OAuth2 authentication** is built in
```

---

**TITLE: Changelog Entry Format**
DESCRIPTION: Example of the standard changelog entry format used throughout the document, showing version number, date, and changes
SOURCE: https://github.com/nodemailer/nodemailer/blob/master/CHANGELOG.md#2025-04-22_snippet_3

LANGUAGE: markdown
CODE:

```
## 6.3.1 2019-10-09

-   Ignore "end" events because it might be "error" after it (dex4er) [72bade9]
-   Set username and password on the connection proxy object correctly (UsamaAshraf) [250b1a8]
-   Support more DNS errors (madarche) [2391aa4]
```

---

**TITLE: Feature Update Entry Format**
DESCRIPTION: Example of how new features are documented in the changelog with associated issue numbers and commit references.
SOURCE: https://github.com/nodemailer/nodemailer/blob/master/CHANGELOG.md#2025-04-22_snippet_1

LANGUAGE: markdown
CODE:

```
### Features

* **services:** add Seznam email service configuration ([#1695](https://github.com/nodemailer/nodemailer/issues/1695)) ([d1ae0a8](https://github.com/nodemailer/nodemailer/commit/d1ae0a86883ba6011a49a5bbdf076098e2e3637a))
```

---

**TITLE: The Duchess's Lullaby - Verse 1**
DESCRIPTION: A cruel lullaby sung by the Duchess to her baby, with a chorus joined by the cook and baby.
SOURCE: https://github.com/nodemailer/nodemailer/blob/master/test/base64/fixtures/alice.txt#2025-04-22_snippet_0

LANGUAGE: text
CODE:

```
   'Speak roughly to your little boy,\\n    And beat him when he sneezes:\\n   He only does it to annoy,\\n    Because he knows it teases.'\\n         CHORUS.\\n (In which the cook and the baby joined):\\n       'Wow! wow! wow!'
```

---

**TITLE: The Duchess's Lullaby - Verse 2**
DESCRIPTION: The second verse of the Duchess's harsh lullaby, maintaining the theme of punishing sneezing.
SOURCE: https://github.com/nodemailer/nodemailer/blob/master/test/base64/fixtures/alice.txt#2025-04-22_snippet_1

LANGUAGE: text
CODE:

```
   'I speak severely to my boy,\\n    I beat him when he sneezes;\\n   For he can thoroughly enjoy\\n    The pepper when he pleases!'\\n         CHORUS.\\n       'Wow! wow! wow!'
```

### `electron`

**TITLE: Listening for IPC Events with ipcMain.on in Electron\'s Main Process**
DESCRIPTION: Sets up an IPC listener in the main process that handles \'set-title\' messages sent from renderer processes. When a message is received, it retrieves the sender\'s BrowserWindow and updates its title.
SOURCE: https://github.com/electron/electron/blob/main/docs/tutorial/ipc.md#2025-04-21_snippet_0

LANGUAGE: javascript
CODE:

```
const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('node:path')

// ...

function handleSetTitle (event, title) {
  const webContents = event.sender
  const win = BrowserWindow.fromWebContents(webContents)
  win.setTitle(title)
}

function createWindow () {
  const mainWindow = new BrowserWindow({
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })
  mainWindow.loadFile('index.html')
}

app.whenReady().then(() => {
  ipcMain.on('set-title', handleSetTitle)
  createWindow()
})
// ...
```

---

**TITLE: IPC Message Handling in Electron Main Process**
DESCRIPTION: Code for the Electron main process to handle IPC messages from a test driver. This shows how to set up communication handlers in the application being tested.
SOURCE: https://github.com/electron/electron/blob/main/docs/tutorial/automated-testing.md#2025-04-21_snippet_16

LANGUAGE: javascript
CODE:

```
// listen for messages from the test suite
process.on('message', (msg) => {
  // ...
})

// send a message to the test suite
process.send({ my: 'message' })
```

---

**TITLE: Handling Invokable IPC Calls in Main Process with ipcMain**
DESCRIPTION: This snippet demonstrates how to use ipcMain.handle() to process invokable IPC calls from renderer processes. The handler returns a Promise whose result will be sent back to the caller.
SOURCE: https://github.com/electron/electron/blob/main/docs/api/ipc-main.md#2025-04-21_snippet_0

LANGUAGE: javascript
CODE:

```
ipcMain.handle('my-invokable-ipc', async (event, ...args) => {
  const result = await somePromise(...args)
  return result
})
```

---

**TITLE: IPC Handler Setup in Main Process**
DESCRIPTION: Demonstrates how to set up an IPC handler in the main process to respond to ping requests from the renderer.
SOURCE: https://github.com/electron/electron/blob/main/docs/tutorial/tutorial-3-preload.md#2025-04-21_snippet_5

LANGUAGE: javascript
CODE:

```
const { app, BrowserWindow, ipcMain } = require('electron/main')
const path = require('node:path')

const createWindow = () => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })
  win.loadFile('index.html')
}
app.whenReady().then(() => {
  ipcMain.handle('ping', () => 'pong')
  createWindow()
})
```

---

**TITLE: Implementing Two-Way IPC with ipcMain.handle for File Dialog**
DESCRIPTION: Sets up a two-way IPC handler in the main process using ipcMain.handle. When invoked, it opens a native file dialog and returns the selected file path to the renderer process.
SOURCE: https://github.com/electron/electron/blob/main/docs/tutorial/ipc.md#2025-04-21_snippet_4

LANGUAGE: javascript
CODE:

```
const { app, BrowserWindow, dialog, ipcMain } = require('electron')
const path = require('node:path')

// ...

async function handleFileOpen () {
  const { canceled, filePaths } = await dialog.showOpenDialog({})
  if (!canceled) {
    return filePaths[0]
  }
}

function createWindow () {
  const mainWindow = new BrowserWindow({
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })
  mainWindow.loadFile('index.html')
}

app.whenReady().then(() => {
  ipcMain.handle('dialog:openFile', handleFileOpen)
  createWindow()
})
// ...
```

---

**TITLE: Setting DevTools WebContents via IPC in Main Process**
DESCRIPTION: This code snippet demonstrates the main process code for setting the DevTools WebContents using `webContents.setDevToolsWebContents` after receiving an IPC message. It retrieves the target and DevTools WebContents based on their IDs and then associates them.
SOURCE: https://github.com/electron/electron/blob/main/docs/api/web-contents.md#_snippet_27

LANGUAGE: JavaScript
CODE:

```
// Main process
const { ipcMain, webContents } = require('electron')
ipcMain.on('openDevTools', (event, webContentsId) => {
  const guest = webContents.fromId(webContentsId)
  guest.openDevTools()
})
```

---

**TITLE: Implementing Forwarding Mouse Events in Electron Main Process**
DESCRIPTION: This JavaScript code for the main process sets up an IPC listener to toggle mouse event ignoring with optional forwarding.
SOURCE: https://github.com/electron/electron/blob/main/docs/tutorial/custom-window-interactions.md#2025-04-21_snippet_4

LANGUAGE: javascript
CODE:

```
const { BrowserWindow, ipcMain } = require('electron')
const path = require('node:path')

const win = new BrowserWindow({
  webPreferences: {
    preload: path.join(__dirname, 'preload.js')
  }
})

ipcMain.on('set-ignore-mouse-events', (event, ignore, options) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  win.setIgnoreMouseEvents(ignore, options)
})
```

---

**TITLE: Log Frame ID in Main Process on IPC Message**
DESCRIPTION: This snippet shows how to access the frame ID from an incoming IPC message in the main process. The `event.frameId` property of the event object provides the ID of the frame that sent the message. This allows the main process to identify the origin of the message.
SOURCE: https://github.com/electron/electron/blob/main/docs/api/web-contents.md#_snippet_30

LANGUAGE: JavaScript
CODE:

```
// In the main process
ipcMain.on('unload-event', (event) => {
  event.senderFrame // ✅ accessed immediately
})

ipcMain.on('unload-event', async (event) => {
  await crossOriginNavigationPromise
  event.senderFrame // ❌ returns `null` due to late access
})
```

---

**TITLE: Using ipcRenderer.invoke with Promise in Electron**
DESCRIPTION: Example showing how to use ipcRenderer.invoke in the renderer process to communicate with the main process and receive a Promise-based response. The main process handles the request using ipcMain.handle.
SOURCE: https://github.com/electron/electron/blob/main/docs/api/ipc-renderer.md#2025-04-21_snippet_0

LANGUAGE: javascript
CODE:

```
// Renderer process
ipcRenderer.invoke('some-name', someArgument).then((result) => {
  // ...
})

// Main process
ipcMain.handle('some-name', async (event, someArgument) => {
  const result = await doSomeWork(someArgument)
  return result
})
```

---

**TITLE: Legacy IPC Communication Using ipcRenderer.send**
DESCRIPTION: Demonstrates two-way communication between renderer and main process using ipcRenderer.send. This pattern was commonly used before Electron 7 but has limitations with message tracking and response handling.
SOURCE: https://github.com/electron/electron/blob/main/docs/tutorial/ipc.md#2025-04-21_snippet_8

LANGUAGE: javascript
CODE:

```
const { ipcRenderer } = require('electron')

ipcRenderer.on('asynchronous-reply', (_event, arg) => {
  console.log(arg) // prints "pong" in the DevTools console
})
ipcRenderer.send('asynchronous-message', 'ping')
```

LANGUAGE: javascript
CODE:

```
ipcMain.on('asynchronous-message', (event, arg) => {
  console.log(arg) // prints "ping" in the Node console
  event.reply('asynchronous-reply', 'pong')
})
```

---

**TITLE: Transferring MessagePort from Renderer to Main Process in Electron**
DESCRIPTION: Example demonstrating how to transfer MessagePort objects from the renderer process to the main process using ipcRenderer.postMessage. The main process receives the ports through the event object.
SOURCE: https://github.com/electron/electron/blob/main/docs/api/ipc-renderer.md#2025-04-21_snippet_1

LANGUAGE: javascript
CODE:

```
// Renderer process
const { port1, port2 } = new MessageChannel()
ipcRenderer.postMessage('port', { message: 'hello' }, [port1])

// Main process
ipcMain.on('port', (e) => {
  // e.ports is a list of ports sent along with this message
  e.ports[0].onmessage = (messageEvent) => {
    console.log(messageEvent.data)
  }
})
```

---

**TITLE: Invoking IPC Calls from Renderer Process**
DESCRIPTION: This snippet shows how to invoke an IPC call from a renderer process using ipcRenderer.invoke(). The function returns a Promise that resolves with the result from the main process handler.
SOURCE: https://github.com/electron/electron/blob/main/docs/api/ipc-main.md#2025-04-21_snippet_1

LANGUAGE: javascript
CODE:

```
async () => {
  const result = await ipcRenderer.invoke('my-invokable-ipc', arg1, arg2)
  // ...
}
```

---

**TITLE: Handle IPC and Start Drag in main.js (Electron)**
DESCRIPTION: This JavaScript code in the main process sets up an IPC listener for the 'ondragstart' event. When the event is received, it retrieves the file path, constructs the full file path, sets the icon, and calls `event.sender.startDrag` to initiate the native drag and drop operation.
SOURCE: https://github.com/electron/electron/blob/main/docs/tutorial/native-file-drag-drop.md#_snippet_3

LANGUAGE: JavaScript
CODE:

```
const { app, BrowserWindow, ipcMain } = require('electron/main')
const path = require('node:path')
const fs = require('node:fs')
const https = require('node:https')

function createWindow () {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })

  win.loadFile('index.html')
}

const iconName = path.join(__dirname, 'iconForDragAndDrop.png')
const icon = fs.createWriteStream(iconName)

// Create a new file to copy - you can also copy existing files.
fs.writeFileSync(path.join(__dirname, 'drag-and-drop-1.md'), '# First file to test drag and drop')
fs.writeFileSync(path.join(__dirname, 'drag-and-drop-2.md'), '# Second file to test drag and drop')

https.get('https://img.icons8.com/ios/452/drag-and-drop.png', (response) => {
  response.pipe(icon)
})

app.whenReady().then(createWindow)

ipcMain.on('ondragstart', (event, filePath) => {
  event.sender.startDrag({
    file: path.join(__dirname, filePath),
    icon: iconName
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
```

---

**TITLE: Implementing Dark Mode Control in Electron Main Process**
DESCRIPTION: This JavaScript snippet shows the main process implementation of dark mode control in Electron. It sets up IPC handlers for toggling dark mode and resetting to system theme, utilizing the nativeTheme API to manage the application's appearance.
SOURCE: https://github.com/electron/electron/blob/main/docs/tutorial/dark-mode.md#2025-04-21_snippet_4

LANGUAGE: javascript
CODE:

```
const { app, BrowserWindow, ipcMain, nativeTheme } = require('electron')
const path = require('node:path')

const createWindow = () => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })

  win.loadFile('index.html')

  ipcMain.handle('dark-mode:toggle', () => {
    if (nativeTheme.shouldUseDarkColors) {
      nativeTheme.themeSource = 'light'
    } else {
      nativeTheme.themeSource = 'dark'
    }
    return nativeTheme.shouldUseDarkColors
  })

  ipcMain.handle('dark-mode:system', () => {
    nativeTheme.themeSource = 'system'
  })
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
```

---

**TITLE: DesktopCapturer.getSources: Removed in Renderer**
DESCRIPTION: This snippet demonstrates how to replace the usage of `desktopCapturer.getSources` in the renderer process by moving it to the main process and using `ipcMain.handle` and `ipcRenderer.invoke` for inter-process communication. It also suggests further restricting the information returned to the renderer for security purposes.
SOURCE: https://github.com/electron/electron/blob/main/docs/breaking-changes.md#_snippet_41

LANGUAGE: javascript
CODE:

```
// Main process
const { ipcMain, desktopCapturer } = require('electron')

ipcMain.handle(
  'DESKTOP_CAPTURER_GET_SOURCES',
  (event, opts) => desktopCapturer.getSources(opts)
)

```

LANGUAGE: javascript
CODE:

```
// Renderer process
const { ipcRenderer } = require('electron')

const desktopCapturer = {
  getSources: (opts) => ipcRenderer.invoke('DESKTOP_CAPTURER_GET_SOURCES', opts)
}
```

---

**TITLE: Using MessageChannelMain for Inter-Process Communication in Electron**
DESCRIPTION: Example demonstrating how to create a MessageChannel in the main process and send one of its ports to a renderer process. The main process creates the channel and sends port2 to the renderer, while using port1 to post messages. The renderer process receives the port and sets up a message handler.
SOURCE: https://github.com/electron/electron/blob/main/docs/api/message-channel-main.md#2025-04-21_snippet_0

LANGUAGE: javascript
CODE:

```
// Main process
const { BrowserWindow, MessageChannelMain } = require('electron')
const w = new BrowserWindow()
const { port1, port2 } = new MessageChannelMain()
w.webContents.postMessage('port', null, [port2])
port1.postMessage({ some: 'message' })

// Renderer process
const { ipcRenderer } = require('electron')
ipcRenderer.on('port', (e) => {
  // e.ports is a list of ports sent along with this message
  e.ports[0].onmessage = (messageEvent) => {
    console.log(messageEvent.data)
  }
})
```

---

**TITLE: IPC Communication in Renderer Process**
DESCRIPTION: Shows how to use the exposed ping function to communicate with the main process from the renderer.
SOURCE: https://github.com/electron/electron/blob/main/docs/tutorial/tutorial-3-preload.md#2025-04-21_snippet_6

LANGUAGE: javascript
CODE:

```
const func = async () => {
  const response = await window.versions.ping()
  console.log(response) // prints out 'pong'
}

func()
```

---

**TITLE: Defining IpcMainInvokeEvent Object Properties in Markdown**
DESCRIPTION: This snippet outlines the properties of the IpcMainInvokeEvent object, including type, processId, frameId, sender, and senderFrame. It provides details on the data types and possible values for each property.
SOURCE: https://github.com/electron/electron/blob/main/docs/api/structures/ipc-main-invoke-event.md#2025-04-21_snippet_0

LANGUAGE: markdown
CODE:

```
# IpcMainInvokeEvent Object extends `Event`

* `type` String - Possible values include `frame`
* `processId` Integer - The internal ID of the renderer process that sent this message
* `frameId` Integer - The ID of the renderer frame that sent this message
* `sender` [WebContents](../web-contents.md) - Returns the `webContents` that sent the message
* `senderFrame` [WebFrameMain](../web-frame-main.md) | null _Readonly_ - The frame that sent this message. May be `null` if accessed after the frame has either navigated or been destroyed.
```

---

**TITLE: Defining IpcMainEvent Object Properties in Markdown**
DESCRIPTION: This snippet lists the properties of the IpcMainEvent object, including their types and descriptions. It covers important attributes like processId, frameId, sender, and methods like reply for handling IPC communication.
SOURCE: https://github.com/electron/electron/blob/main/docs/api/structures/ipc-main-event.md#2025-04-21_snippet_0

LANGUAGE: markdown
CODE:

```
# IpcMainEvent Object extends `Event`

* `type` String - Possible values include `frame`
* `processId` Integer - The internal ID of the renderer process that sent this message
* `frameId` Integer - The ID of the renderer frame that sent this message
* `returnValue` any - Set this to the value to be returned in a synchronous message
* `sender` [WebContents](../web-contents.md) - Returns the `webContents` that sent the message
* `senderFrame` [WebFrameMain](../web-frame-main.md) | null _Readonly_ - The frame that sent this message. May be `null` if accessed after the frame has either navigated or been destroyed.
* `ports` [MessagePortMain](../message-port-main.md)[] - A list of MessagePorts that were transferred with this message
* `reply` Function - A function that will send an IPC message to the renderer frame that sent the original message that you are currently handling.  You should use this method to \"reply\" to the sent message in order to guarantee the reply will go to the correct process and frame.
  * `channel` string
  * `...args` any[]
```

---

**TITLE: Accessing webContents from webview using IPC - JavaScript**
DESCRIPTION: Demonstrates how to securely access the webContents of a `<webview>` using IPC, avoiding the deprecated `webview.getWebContents()` method. It includes both the main and renderer process code. Requires `electron` to be installed to provide `ipcMain`, `webContents` and `ipcRenderer` modules.
SOURCE: https://github.com/electron/electron/blob/main/docs/breaking-changes.md#_snippet_74

LANGUAGE: javascript
CODE:

```
// main
const { ipcMain, webContents } = require('electron')

const getGuestForWebContents = (webContentsId, contents) => {
  const guest = webContents.fromId(webContentsId)
  if (!guest) {
    throw new Error(`Invalid webContentsId: ${webContentsId}`)
  }
  if (guest.hostWebContents !== contents) {
    throw new Error('Access denied to webContents')
  }
  return guest
}

ipcMain.handle('openDevTools', (event, webContentsId) => {
  const guest = getGuestForWebContents(webContentsId, event.sender)
  guest.openDevTools()
})

// renderer
const { ipcRenderer } = require('electron')

ipcRenderer.invoke('openDevTools', webview.getWebContentsId())
```

---

**TITLE: Implementing Inter-Process Communication with parentPort in Electron**
DESCRIPTION: Example of bidirectional communication between renderer and main process using parentPort. The main process sends a message to the child process, which then processes the message and sends a response back to the parent.
SOURCE: https://github.com/electron/electron/blob/main/docs/api/parent-port.md#2025-04-21_snippet_0

LANGUAGE: javascript
CODE:

```
// Main process
const child = utilityProcess.fork(path.join(__dirname, 'test.js'))
child.postMessage({ message: 'hello' })
child.on('message', (data) => {
  console.log(data) // hello world!
})

// Child process
process.parentPort.on('message', (e) => {
  process.parentPort.postMessage(`${e.data} world!`)
})
```

---

**TITLE: Handling Invokable IPC Messages with ipcMainServiceWorker.handle()**
DESCRIPTION: Registers a handler for invokable IPC messages on a specific channel. The handler can return a value or a Promise that resolves to a value.
SOURCE: https://github.com/electron/electron/blob/main/docs/api/ipc-main-service-worker.md#2025-04-21_snippet_4

LANGUAGE: javascript
CODE:

```
ipcMainServiceWorker.handle(channel, listener)
```

---

**TITLE: Accessing WebFrameMain properties in IPC events**
DESCRIPTION: This example shows the correct way to access WebFrameMain properties immediately upon receiving an IPC event to avoid issues with detached frames and null returns due to cross-origin navigations. The first `ipcMain.on` shows immediate access while the second demonstrates late access leading to a `null` return.
SOURCE: https://github.com/electron/electron/blob/main/docs/api/web-contents.md#_snippet_30

LANGUAGE: JavaScript
CODE:

```
// In the main process
ipcMain.on('unload-event', (event) => {
  event.senderFrame // ✅ accessed immediately
})

ipcMain.on('unload-event', async (event) => {
  await crossOriginNavigationPromise
  event.senderFrame // ❌ returns `null` due to late access
})
```

---

**TITLE: Handling a Single Invokable IPC Message with ipcMainServiceWorker.handleOnce()**
DESCRIPTION: Registers a one-time handler for an invokable IPC message on a specific channel. After handling a single invocation, the handler is automatically removed.
SOURCE: https://github.com/electron/electron/blob/main/docs/api/ipc-main-service-worker.md#2025-04-21_snippet_5

LANGUAGE: javascript
CODE:

```
ipcMainServiceWorker.handleOnce(channel, listener)
```

TITLE: Configuring vite-plugin-electron (Simple API)
DESCRIPTION: Demonstrates how to add `vite-plugin-electron/simple` to the `plugins` array in `vite.config.ts`. It configures the entry points for the main process and preload scripts, and optionally enables Node.js API usage in the renderer.
SOURCE: https://github.com/electron-vite/vite-plugin-electron/blob/main/README.md#_snippet_1

LANGUAGE: javascript
CODE:

```
import electron from 'vite-plugin-electron/simple'

export default {
  plugins: [
    electron({
      main: {
        // Shortcut of `build.lib.entry`
        entry: 'electron/main.ts',
      },
      preload: {
        // Shortcut of `build.rollupOptions.input`
        input: 'electron/preload.ts',
      },
      // Optional: Use Node.js API in the Renderer process
      renderer: {},
    }),
  ],
}
```

---

TITLE: Updating package.json for Main Entry
DESCRIPTION: Shows the necessary modification to the `package.json` file. It adds or updates the `main` field to point to the output path of the built Electron main process script, allowing Electron to find the entry point.
SOURCE: https://github.com/electron-vite/vite-plugin-electron/blob/main/README.md#_snippet_3

LANGUAGE: json
CODE:

```
{
+ "main": "dist-electron/main.mjs"
}
```

---

TITLE: Initializing Electron Main Process and Window
DESCRIPTION: Basic Electron main process setup. It waits for the app to be ready, creates a `BrowserWindow`, and loads either the development server URL or the built HTML file depending on the environment.
SOURCE: https://github.com/electron-vite/vite-plugin-electron/blob/main/README.md#_snippet_2

LANGUAGE: javascript
CODE:

```
import { app, BrowserWindow } from 'electron'

app.whenReady().then(() => {
  const win = new BrowserWindow({
    title: 'Main window',
  })

  // You can use `process.env.VITE_DEV_SERVER_URL` when the vite command is called `serve`
  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    // Load your file
    win.loadFile('dist/index.html');
  }
})
```

---

TITLE: Installing vite-plugin-electron Dependency
DESCRIPTION: Command to install `vite-plugin-electron` as a development dependency using npm. This is the first step in setting up the plugin for an Electron project using Vite.
SOURCE: https://github.com/electron-vite/vite-plugin-electron/blob/main/README.md#_snippet_0

LANGUAGE: shell
CODE:

```
npm i -D vite-plugin-electron
```

---

TITLE: Implementing Hot Reload for Preload Scripts
DESCRIPTION: Code snippet for the main process (`electron/main.ts`) that listens for the `electron-vite&type=hot-reload` message. Upon receiving this message, it iterates through all open browser windows and reloads their web contents, effectively hot-reloading updated preload scripts.
SOURCE: https://github.com/electron-vite/vite-plugin-electron/blob/main/README.md#_snippet_7

LANGUAGE: javascript
CODE:

```
// electron/main.ts

process.on('message', (msg) => {
  if (msg === 'electron-vite&type=hot-reload') {
    for (const win of BrowserWindow.getAllWindows()) {
      // Hot reload preload scripts
      win.webContents.reload()
    }
  }
})
```

---

TITLE: Using JavaScript API for Build and Startup
DESCRIPTION: Example showing how to programmatically build the Electron process files using the `build` function and start the Electron application in development mode using the `startup` function within a custom Vite plugin hook.
SOURCE: https://github.com/electron-vite/vite-plugin-electron/blob/main/README.md#_snippet_6

LANGUAGE: javascript
CODE:

```
import { build, startup } from 'vite-plugin-electron'

const isDev = process.env.NODE_ENV === 'development'
const isProd = process.env.NODE_ENV === 'production'

build({
  entry: 'electron/main.ts',
  vite: {
    mode: process.env.NODE_ENV,
    build: {
      minify: isProd,
      watch: isDev ? {} : null,
    },
    plugins: [{
      name: 'plugin-start-electron',
      closeBundle() {
        if (isDev) {
          // Startup Electron App
          startup()
        }
      },
    }],
  },
})
```

---

TITLE: Configuring vite-plugin-electron (Flat API)
DESCRIPTION: Demonstrates configuring the plugin using the flat API (`vite-plugin-electron`). Unlike the simple API, it only requires specifying the main entry point, offering more flexibility but requiring manual handling of preload scripts configuration if needed.
SOURCE: https://github.com/electron-vite/vite-plugin-electron/blob/main/README.md#_snippet_4

LANGUAGE: javascript
CODE:

```
import electron from 'vite-plugin-electron'

export default {
  plugins: [
    electron({
      entry: 'electron/main.ts',
    }),
  ],
}
```

---

TITLE: Using vite-plugin-electron JavaScript Build API (TypeScript)
DESCRIPTION: Demonstrates how to use the `build`, `withExternalBuiltins`, `resolveViteConfig`, and `startup` functions programmatically, introduced in v0.11.0. It configures a build with externalized Node.js builtins, default Vite config, and custom options, then starts the Electron app in a `closeBundle` plugin hook. Requires importing these functions from `vite-plugin-electron`.
SOURCE: https://github.com/electron-vite/vite-plugin-electron/blob/main/CHANGELOG.md#_snippet_4

LANGUAGE: TypeScript
CODE:

```
build(
  withExternalBuiltins( // external Node.js builtin modules
    resolveViteConfig( // with default config
      {
        entry: 'foo.ts',
        vite: {
          mode: 'foo-mode', // for .env file
          plugins: [{
            name: 'plugin-build-done',
            closeBundle() {
              // Startup Electron App
              startup()
            },
          }],
        },
      }
    )
  )
)
```

---

TITLE: Externalizing Native Node.js Modules
DESCRIPTION: Demonstrates how to configure the `vite-plugin-electron` options to add specific native Node.js modules (like `serialport`, `sqlite3`) to the `external` list in Rollup options. This prevents Vite from trying to bundle them, allowing Electron to load them externally.
SOURCE: https://github.com/electron-vite/vite-plugin-electron/blob/main/README.md#_snippet_8

LANGUAGE: javascript
CODE:

```
export default {
  plugins: [
    electron({
      entry: 'electron/main.ts',
      vite: {
        build: {
          rollupOptions: {
            // Here are some C/C++ modules them can't be built properly
            external: [
              'serialport',
              'sqlite3',
            ],
          },
        },
      },
    }),
  ],
}
```

---

TITLE: Configuring vite-plugin-electron Simple API (JavaScript)
DESCRIPTION: Demonstrates how to configure the `vite-plugin-electron/simple` plugin. It requires importing the plugin and passing an options object with `main`, `preload`, and `renderer` fields. This is a basic setup for different Electron process types introduced in v0.14.0-beta.0.
SOURCE: https://github.com/electron-vite/vite-plugin-electron/blob/main/CHANGELOG.md#_snippet_1

LANGUAGE: JavaScript
CODE:

```
import electron from 'vite-plugin-electron/simple'

electron({
  main: {},
  preload: {},
  renderer: {},
})
```

---

TITLE: Configuring vite-plugin-electron-renderer for Node.js Integration (TS)
DESCRIPTION: Explains how to enable Node.js integration in the Electron renderer process build configuration using `vite-plugin-electron-renderer` to resolve the 'require is not defined' error, allowing the use of Node.js APIs.
SOURCE: https://github.com/electron-vite/vite-plugin-electron/blob/main/CHANGELOG.md#_snippet_8

LANGUAGE: typescript
CODE:

```
import renderer from 'vite-plugin-electron-renderer'

// In plugins option
renderer({
  nodeIntegration: true,
})
```

---

TITLE: Integrating vite-plugin-native for Native Modules
DESCRIPTION: Shows an alternative method for handling native Node.js modules by integrating the `vite-plugin-native` plugin directly into the nested Vite configuration within the `vite-plugin-electron` options.
SOURCE: https://github.com/electron-vite/vite-plugin-electron/blob/main/README.md#_snippet_9

LANGUAGE: javascript
CODE:

```
import native from 'vite-plugin-native'

export default {
  plugins: [
    electron({
      entry: 'electron/main.ts',
      vite: {
        plugins: [
          native(/* options */),
        ],
      },
    }),
  ],
}
```

---

TITLE: Configuring Renderer and Worker with Node.js Integration (TS)
DESCRIPTION: Configures the Vite build for the Electron renderer process and its associated workers using `vite-plugin-electron-renderer`, enabling Node.js integration in both the renderer thread and the worker threads.
SOURCE: https://github.com/electron-vite/vite-plugin-electron/blob/main/CHANGELOG.md#_snippet_11

LANGUAGE: typescript
CODE:

```
import renderer, { worker } from 'vite-plugin-electron-renderer'

export default {
  plugins: [
    renderer({
      // If you need use Node.js in Electron-Renderer process
      nodeIntegration: true,
    }),
  ],
  worker: {
    plugins: [
      worker({
        // If you need use Node.js in Worker
        nodeIntegrationInWorker: true,
      }),
    ],
  },
}
```

---

TITLE: Instantiating Worker in Electron Main Process (TS)
DESCRIPTION: Demonstrates how to create a new Node.js `Worker` instance from the Electron main process, referencing a script that is built as a separate entry point by `vite-plugin-electron`.
SOURCE: https://github.com/electron-vite/vite-plugin-electron/blob/main/CHANGELOG.md#_snippet_10

LANGUAGE: typescript
CODE:

```
// In electron/main.ts
new Worker(path.join(__dirname, './worker.js'))
```

---

TITLE: Handling Hot-Reload Message in Electron Main Process (JavaScript)
DESCRIPTION: This JavaScript snippet demonstrates how to handle the 'electron-vite&type=hot-reload' message in the Electron main process. Upon receiving this message, it iterates through all active browser windows and reloads their web contents, facilitating hot-reloading for preload scripts or applications without a renderer process.
SOURCE: https://github.com/electron-vite/vite-plugin-electron/blob/main/CHANGELOG.md#_snippet_0

LANGUAGE: js
CODE:

```
// electron/main.ts

process.on('message', (msg) => {
  if (msg === 'electron-vite&type=hot-reload') {
    for (const win of BrowserWindow.getAllWindows()) {
      // Hot reload preload scripts
      win.webContents.reload()
    }
  }
})
```

---

TITLE: Configuring vite-plugin-electron for Multiple Entries (TS)
DESCRIPTION: Shows how to configure `vite-plugin-electron` to include multiple entry points for the Electron main process build, useful for scenarios like including a separate worker script.
SOURCE: https://github.com/electron-vite/vite-plugin-electron/blob/main/CHANGELOG.md#_snippet_9

LANGUAGE: typescript
CODE:

```
import electron from 'vite-plugin-electron'

// In plugins option
electron({
  entry: [
    'electron/main.ts',
    'electron/worker.ts',
  ],
})
```

---

TITLE: Configuring Multiple Entry Files (Config Array) (TypeScript)
DESCRIPTION: Illustrates configuring the `electron` plugin with an array of configuration objects. Each object can specify its own `entry` (which can also be an array) and `vite` options, allowing for multiple independent builds or processes within Electron, as described in v0.10.0.
SOURCE: https://github.com/electron-vite/vite-plugin-electron/blob/main/CHANGELOG.md#_snippet_6

LANGUAGE: TypeScript
CODE:

```
import electron from 'vite-plugin-electron'

// Or use configuration array
electron([
  {
    entry: [
      'electron/entry-1.ts',
      'electron/entry-2.ts',
    ],
  },
  {
    entry: 'foo/bar.ts',
  },
])
```

---

TITLE: Configuring Multiple Entry Files (Array) (TypeScript)
DESCRIPTION: Demonstrates configuring the `electron` plugin with an array of entry file paths for the `entry` option. This allows the plugin to process multiple main process files within a single configuration object, a feature highlighted in v0.10.0 and requiring Vite v3.2.0+.
SOURCE: https://github.com/electron-vite/vite-plugin-electron/blob/main/CHANGELOG.md#_snippet_5

LANGUAGE: TypeScript
CODE:

```
import electron from 'vite-plugin-electron'

// In plugins option
electron({
  entry: [
    'electron/entry-1.ts',
    'electron/entry-2.ts',
  ],
})
```

---

TITLE: Configuring vite-plugin-electron NotBundle Plugin (JavaScript)
DESCRIPTION: This snippet shows how to integrate the `notBundle` experimental feature into a Vite project using `vite-plugin-electron`. It adds the `notBundle` plugin to the Vite configuration specifically when the `command` is `serve`, effectively disabling bundling for certain modules during development for faster build times. Requires `vite-plugin-electron` v0.13.0 or later.
SOURCE: https://github.com/electron-vite/vite-plugin-electron/blob/main/README.md#_snippet_10

LANGUAGE: JavaScript
CODE:

```
import electron from 'vite-plugin-electron'
import { notBundle } from 'vite-plugin-electron/plugin'

export default defineConfig(({ command }) => ({
  plugins: [
    electron({
      entry: 'electron/main.ts',
      vite: {
        plugins: [
          command === 'serve' && notBundle(/* NotBundleOptions */),
        ],
      },
    }),
  ],
}))
```

---

TITLE: Conditionally Adding notBundle Plugin (TypeScript)
DESCRIPTION: Illustrates how to include the `notBundle` plugin only when the Vite command is 'serve'. This requires importing `defineConfig` from `vite` and `notBundle` from `vite-plugin-electron/plugin`. It configures the main electron entry point and adds the conditional plugin within the `vite.plugins` array, as shown in v0.13.0-beta.3.
SOURCE: https://github.com/electron-vite/vite-plugin-electron/blob/main/CHANGELOG.md#_snippet_2

LANGUAGE: TypeScript
CODE:

```
import electron from 'vite-plugin-electron'
import { defineConfig } from 'vite'
import { notBundle } from 'vite-plugin-electron/plugin'

export default defineConfig(({ command }) => ({
  plugins: [
    electron({
      entry: 'electron/main.ts',
      vite: {
        plugins: [
          command === 'serve' && notBundle(/* NotBundleOptions */),
        ],
      },
    }),
  ],
}))
```

---

TITLE: Adding notBundle Plugin to Vite Config (TypeScript)
DESCRIPTION: Shows how to add the standalone `notBundle` plugin to a Vite configuration object using a plain config structure. It requires importing `notBundle` from `vite-plugin-electron/plugin`. The plugin is added to the `vite.plugins` array within the main `electron` plugin configuration, demonstrated in v0.13.0-beta.2.
SOURCE: https://github.com/electron-vite/vite-plugin-electron/blob/main/CHANGELOG.md#_snippet_3

LANGUAGE: TypeScript
CODE:

```
import electron from 'vite-plugin-electron'
import { notBundle } from 'vite-plugin-electron/plugin'

export default {
  plugins: [
    electron({
      entry: 'electron/main.ts',
      vite: {
        plugins: [
          notBundle(/* NotBundleOptions */),
        ],
      },
    }),
  ],
}
```

---

TITLE: Defining NotBundleOptions Interface (TypeScript)
DESCRIPTION: This TypeScript snippet defines the `NotBundleOptions` interface used by the `notBundle` plugin function. It specifies a single optional property, `filter`, which is a function allowing custom filtering logic to control which modules are excluded from bundling. This interface helps developers understand the configuration possibilities for the `notBundle` feature.
SOURCE: https://github.com/electron-vite/vite-plugin-electron/blob/main/README.md#_snippet_11

LANGUAGE: TypeScript
CODE:

```
export interface NotBundleOptions {
  filter?: (id: string) => void | false
}
```

---

TITLE: Defining ElectronOptions Interface (Flat API)
DESCRIPTION: Provides the TypeScript definition for the options object accepted by the flat API. It details properties like `entry`, nested Vite configuration, and the `onstart` hook which provides control over the Electron startup process.
SOURCE: https://github.com/electron-vite/vite-plugin-electron/blob/main/README.md#_snippet_5

LANGUAGE: typescript
CODE:

```
export interface ElectronOptions {
  /**
   * Shortcut of `build.lib.entry`
   */
  entry?: import('vite').LibraryOptions['entry']
  vite?: import('vite').InlineConfig
  /**
   * Triggered when Vite is built every time -- `vite serve` command only.
   *
   * If this `onstart` is passed, Electron App will not start automatically.
   * However, you can start Electroo App via `startup` function.
   */
  onstart?: (args: {
    /**
     * Electron App startup function.
     * It will mount the Electron App child-process to `process.electronApp`.
     * @param argv default value `['.', '--no-sandbox']`
     * @param options options for `child_process.spawn`
     * @param customElectronPkg custom electron package name (default: 'electron')
     */
    startup: (argv?: string[], options?: import('node:child_process').SpawnOptions, customElectronPkg?: string) => Promise<void>
    /** Reload Electron-Renderer */
    reload: () => void
  }) => void | Promise<void>
}
```

---

TITLE: Configuration Type Definition (TypeScript)
DESCRIPTION: Defines the TypeScript interface for the `vite-plugin-electron` configuration object, specifically the structure used in version 0.11.0. It details the available options like `entry` (shortcut for `build.lib.entry`), `onstart` callback, and nested `vite` options.
SOURCE: https://github.com/electron-vite/vite-plugin-electron/blob/main/CHANGELOG.md#_snippet_7

LANGUAGE: TypeScript
CODE:

```
export type Configuration = {
  /**
   * Shortcut of `build.lib.entry`
   */
  entry?: import('vite').LibraryOptions['entry']
  /**
   * Triggered when Vite is built.
   * If passed this parameter will not automatically start Electron App.
   * You can start Electron App through the `startup` function passed through the callback function.
   */
  onstart?: (this: import('rollup').PluginContext, startup: (args?: string[]) => Promise<void>) => void
  vite?: import('vite').InlineConfig
}
```
