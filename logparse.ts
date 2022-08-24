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

function clearFile() {
      let fileElement = document.getElementById('file') as HTMLInputElement;
      fileElement.value = '';
}

function clearText() {
      let textAreaElement = document.getElementById('rawText') as HTMLTextAreaElement;
      textAreaElement.value = '';
}

function parseFile() {
      let fileElement = document.getElementById('file') as HTMLInputElement;

      if ('files' in fileElement) {
            let fileToLoad = fileElement.files[0];
            let fileReader = new FileReader();      
            fileReader.onload = function (fileLoadedEvent) {
                  let fileText = fileLoadedEvent.target.result as string;
                  let rowData = getLogEntries(fileText);
                  gridOptions['api'].setRowData(rowData);

                  autoSizeAll(false);

                  clearText();
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
      let textAreaElement = document.getElementById('rawText') as HTMLTextAreaElement;
      if (!!textAreaElement.value.trim()) {
            let rowData = getLogEntries(textAreaElement.value);
            gridOptions['api'].setRowData(rowData);
      
            autoSizeAll(false);
      
            clearText();
            clearFile();
      }
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
            const headerRegex = /(.*)?(trce|dbug|warn|fail|crit|info): ((?:.*)\[(?:[0-9]+)\]) ?(.*)/;
            let lines = input.split(/\r?\n/).filter(x => !/^\s*$/.test(x)).map(x => x.replace(/(\x1b)\[[0-9]+m/g, ''));

            let alertedSingleLine = false;
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

                        // This is a "single line" entry. Header and message are on same line.
                        if (!!parts[4]) {
                              if (!alertedSingleLine) {
                                    alert('Your logs are in "Single Line" mode.\nThere is no reliable way to separate scopes from the message, so they are both included in the Message field.\nSee the "About" page for more details.');
                                    alertedSingleLine = true;
                              }

                              currentEntry.MessageLines.push(parts[4]);
                        }
                  }
            });

            // Last entry never gets pushed by the next header, so add it manually
            entries.push(currentEntry);

            return entries;
      } catch (error) {
            alert('Could not parse your input.\nPlease make sure it is in the standard .NET format.\nSee the "About" page for more details.');
            return [];
      }
}

function autoSizeAll(skipHeader: boolean) {
      const allColumnIds = [];
      gridOptions['columnApi'].getColumns().forEach((column) => {
            allColumnIds.push(column.getId());
      });

      gridOptions['columnApi'].autoSizeColumns(allColumnIds, skipHeader);
}

function setDarkLight(darkMode: boolean) {
      const gridDiv = document.querySelector('#logsGrid');
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
      const gridDiv = document.querySelector('#logsGrid');
      new window['agGrid'].Grid(gridDiv, gridOptions);
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            setDarkLight(true);
      }
});

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
      setDarkLight(e.matches);
});