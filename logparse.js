var Log = /** @class */ (function () {
    function Log() {
    }
    return Log;
}());
var Level;
(function (Level) {
    Level["trce"] = "Trace";
    Level["dbug"] = "Debug";
    Level["warn"] = "Warning";
    Level["fail"] = "Error";
    Level["crit"] = "Critical";
    Level["info"] = "Information";
})(Level || (Level = {}));
function parseFile() {
    var fileElement = document.getElementById('file');
    if ('files' in fileElement) {
        var fileToLoad = fileElement.files[0];
        var fileReader = new FileReader();
        fileReader.onload = function (fileLoadedEvent) {
            var textAreaElement = document.getElementById('rawText');
            textAreaElement.value = '';
            var fileText = fileLoadedEvent.target.result;
            var rowData = getLogEntries(fileText);
            gridOptions['api'].setRowData(rowData);
            autoSizeAll(false);
        };
        fileReader.readAsText(fileToLoad, 'UTF-8');
    }
    else {
        if (fileElement.value == '') {
            alert('Select a file');
        }
        else {
            alert('File upload is not supported by your browser.');
        }
    }
}
function parseText() {
    var fileElement = document.getElementById('file');
    fileElement.value = '';
    var textAreaElement = document.getElementById('rawText');
    var rowData = getLogEntries(textAreaElement.value);
    gridOptions['api'].setRowData(rowData);
    autoSizeAll(false);
}
function getTimestamp(timestampPart) {
    if (!timestampPart) {
        return null;
    }
    var originalLength = timestampPart.length;
    for (var skip = 0; skip < originalLength; skip++) {
        for (var drop = 0; drop < originalLength - skip; drop++) {
            var attempt = timestampPart.substring(skip, originalLength - drop) + 'Z';
            if (!isNaN(Date.parse(attempt))) {
                return new Date(attempt);
            }
        }
    }
    return null;
}
function getLogEntries(input) {
    try {
        var headerRegex_1 = /(.*)?(trce|dbug|warn|fail|crit|info): (.*)/;
        var lines = input.split(/\r?\n/).filter(function (x) { return !/^\s*$/.test(x); }).map(function (x) { return x.replace(/(\x1b)\[[0-9]+m/g, ''); });
        var currentEntry_1 = new Log();
        var entries_1 = [];
        var currentIndex_1 = 1;
        lines.forEach(function (line) {
            if (/^\s+=>/.test(line)) {
                // Scope line
                currentEntry_1.Scopes = line.split('=>').map(function (x) { return x.trim(); }).filter(Boolean);
            }
            else if (/^\s+/.test(line)) {
                // Message line
                currentEntry_1.MessageLines.push(line.trim());
            }
            else {
                // Header line
                if (currentIndex_1 > 1) {
                    entries_1.push(currentEntry_1);
                }
                var parts = line.match(headerRegex_1);
                currentEntry_1 = new Log();
                currentEntry_1.Order = currentIndex_1++;
                currentEntry_1.Timestamp = getTimestamp(parts[1]);
                currentEntry_1.Level = Level[parts[2]];
                currentEntry_1.Type = parts[3];
                currentEntry_1.MessageLines = [];
                currentEntry_1.Scopes = [];
            }
        });
        // Last entry never gets pushed by the next header, so add it manually
        entries_1.push(currentEntry_1);
        return entries_1;
    }
    catch (error) {
        alert('Could not parse your input. Please make sure it is in the expected format.');
        return [];
    }
}
function autoSizeAll(skipHeader) {
    var allColumnIds = [];
    gridOptions['columnApi'].getColumns().forEach(function (column) {
        allColumnIds.push(column.getId());
    });
    gridOptions['columnApi'].autoSizeColumns(allColumnIds, skipHeader);
}
var columnDefs = [
    {
        field: 'Order',
        filter: 'agNumberColumnFilter'
    },
    {
        field: 'Timestamp',
        filter: 'agDateColumnFilter'
    },
    {
        field: 'Level',
        filter: 'agSetColumnFilter'
    },
    {
        field: 'Type',
        filter: 'agSetColumnFilter'
    },
    {
        field: 'Scopes',
        filter: 'agSetColumnFilter',
        cellRenderer: function (param) {
            return param.data.Scopes.join('<br>');
        }
    },
    {
        field: 'MessageLines',
        headerName: 'Message',
        filter: 'agTextColumnFilter',
        cellRenderer: function (param) {
            return param.data.MessageLines.join('<br>');
        }
    }
];
// let the grid know which columns and what data to use
var gridOptions = {
    defaultColDef: {
        sortable: true,
        resizable: true,
        wrapText: true,
        autoHeight: true
    },
    enableCellTextSelection: true,
    ensureDomOrder: true,
    columnDefs: columnDefs,
    rowData: []
};
// setup the grid after the page has finished loading
document.addEventListener('DOMContentLoaded', function () {
    var gridDiv = document.querySelector('#myGrid');
    new window['agGrid'].Grid(gridDiv, gridOptions);
});
