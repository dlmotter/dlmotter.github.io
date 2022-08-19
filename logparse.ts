class Log {
      Order: number;
      Timestamp: Date;
      Level: Level;
      Type: string;
      MessageLines: string[];
      Scopes: string[];
}

enum Level {
      trce = "Trace",
      dbug = "Debug",
      warn = "Warning",
      fail = "Error",
      crit = "Critical",
      info = "Information"
}

function parseFile() {
      let fileElement = document.getElementById('file') as HTMLInputElement;

      if ('files' in fileElement) {
            var fileToLoad = fileElement.files[0];

            var fileReader = new FileReader();
            fileReader.onload = function (fileLoadedEvent) {
                  let textAreaElement = document.getElementById('rawText') as HTMLTextAreaElement;
                  textAreaElement.value = '';

                  var fileText = fileLoadedEvent.target.result as string;

                  let rowData = getLogEntries(fileText);
                  gridOptions['api'].setRowData(rowData);
                  autoSizeAll(false);
            };

            fileReader.readAsText(fileToLoad, 'UTF-8');
      } else {
            if (fileElement.value == '') {
                  alert('Select a file');
            } else {
                  alert('File upload is not supported by your browser.');
            }
      }
}

function parseText() {
      let fileElement = document.getElementById('file') as HTMLInputElement;
      fileElement.value = '';

      let textAreaElement = document.getElementById('rawText') as HTMLTextAreaElement;

      let rowData = getLogEntries(textAreaElement.value);
      gridOptions['api'].setRowData(rowData);
      autoSizeAll(false);
}

function getTimestamp(timestampPart: string): Date {
      if (!timestampPart) {
            return null;
      }

      let originalLength = timestampPart.length;

      for (let skip = 0; skip < originalLength; skip++) {
            for (let drop = 0; drop < originalLength - skip; drop++) {
                  let attempt = timestampPart.substring(skip, originalLength - drop) + 'Z';
                  if (!isNaN(Date.parse(attempt))) {
                        return new Date(attempt);
                  }
            }
      }

      return null;
}

function getLogEntries(input: string): Log[] {
      try {
            const headerRegex = /(.*)?(trce|dbug|warn|fail|crit|info): (.*)/;
            let lines = input.split(/\r?\n/).filter(x => !/^\s*$/.test(x)).map(x => x.replace(/(\x1b)\[[0-9]+m/g, ''));

            let currentEntry = new Log();
            let entries: Log[] = [];
            let currentIndex = 1;
            lines.forEach(line => {
                  if (/^\s+=>/.test(line)) {
                        // Scope line
                        currentEntry.Scopes = line.split('=>').map(x => x.trim()).filter(Boolean);
                  }
                  else if (/^\s+/.test(line)) {
                        // Message line
                        currentEntry.MessageLines.push(line.trim());
                  }
                  else {
                        // Header line
                        if (currentIndex > 1) {
                              entries.push(currentEntry);
                        }

                        let parts = line.match(headerRegex);

                        currentEntry = new Log();
                        currentEntry.Order = currentIndex++;
                        currentEntry.Timestamp = getTimestamp(parts[1]);
                        currentEntry.Level = Level[parts[2]];
                        currentEntry.Type = parts[3];
                        currentEntry.MessageLines = [];
                        currentEntry.Scopes = [];
                  }
            });

            // Last entry never gets pushed by the next header, so add it manually
            entries.push(currentEntry);

            return entries;
      } catch (error) {
            alert('Could not parse your input. Please make sure it is in the expected format.');
            return [];
      }
}

function autoSizeAll(skipHeader) {
      const allColumnIds = [];
      gridOptions['columnApi'].getColumns().forEach((column) => {
            allColumnIds.push(column.getId());
      });

      gridOptions['columnApi'].autoSizeColumns(allColumnIds, skipHeader);
}

function setDarkLight(darkMode: boolean) {
      const gridDiv = document.querySelector('#myGrid');
      if (darkMode) {
            gridDiv.className = 'ag-theme-alpine-dark';
      } else {
            gridDiv.className = 'ag-theme-alpine';
      }
}

const columnDefs = [
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
const gridOptions = {
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
document.addEventListener('DOMContentLoaded', () => {
      const gridDiv = document.querySelector('#myGrid');
      new window['agGrid'].Grid(gridDiv, gridOptions);
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            setDarkLight(true);
      }
});

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
      setDarkLight(e.matches);
});