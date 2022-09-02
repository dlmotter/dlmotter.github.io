class Log {
      Order: number;
      Timestamp: Date;
      Level: Level;
      Type: string;
      EventId: number;
      MessageLines: string[];
      Scopes: string[];
}

enum Level {
      trce = "Trace",
      dbug = "Debug",
      info = "Information",
      warn = "Warning",
      fail = "Error",
      crit = "Critical"
}

class LevelFilter {
      private readonly agChecked: string = 'ag-checked';
      private readonly agIndet: string = 'ag-indeterminate';
      private readonly selectAll: string = 'selectAll';

      private eGui: HTMLDivElement;
      private initParams: any;
      private levelCounts: { [levelValue: string]: number } = {};
      private levelSelections: { [levelValue: string]: boolean } = {};
      private cbWrapperMap: { [level: string]: HTMLDivElement } = {};

      init(params) {
            this.initParams = params;

            // Calculate level counts
            Object.keys(Level).forEach(level => {
                  this.levelCounts[Level[level]] = 0;
            });
            params.api.forEachLeafNode(row => {
                  this.levelCounts[row.data.Level]++;
            });

            // Calculate initial GUI
            this.eGui = document.createElement('div');
            let itemTemplate = `
                  <div class="filter-item">
                        <div id="#ID#Lbl" class="filter-item-label">#LABEL#</div>
                        <div id="#ID#CbWrapper" class="ag-wrapper ag-input-wrapper ag-checkbox-input-wrapper ag-checked">
                              <input id="#ID#Cb" type="checkbox" class="ag-input-field-input ag-checkbox-input">
                        </div>
                  </div>`;
            let itemsHtml = itemTemplate.replace(/#ID#/g, this.selectAll).replace(/#LABEL#/g, '(Select All)');
            Object.keys(Level).forEach(level => {
                  itemsHtml += itemTemplate.replace(/#ID#/g, level).replace(/#LABEL#/g, `${Level[level]} (${this.levelCounts[Level[level]]})`);
            });
            this.eGui.innerHTML = `<div class="filter-container">${itemsHtml}</div>`;

            // Set up listeners
            this.cbWrapperMap[this.selectAll] = this.eGui.querySelector(`#${this.selectAll}CbWrapper`);
            this.eGui.querySelector(`#${this.selectAll}Lbl`).addEventListener('click', this.onCheckboxClick.bind(this, this.selectAll));
            this.eGui.querySelector(`#${this.selectAll}Cb`).addEventListener('click', this.onCheckboxClick.bind(this, this.selectAll));
            Object.keys(Level).forEach(level => {
                  this.cbWrapperMap[level] = this.eGui.querySelector(`#${level}CbWrapper`);
                  this.eGui.querySelector(`#${level}Lbl`).addEventListener('click', this.onCheckboxClick.bind(this, level));
                  this.eGui.querySelector(`#${level}Cb`).addEventListener('click', this.onCheckboxClick.bind(this, level));
            });
      }

      getGui() {
            return this.eGui;
      }

      onCheckboxClick(level: string) {
            // Change value of the clicked checkbox
            let cb = this.cbWrapperMap[level];
            if (cb.classList.contains(this.agChecked)) {
                  cb.classList.remove(this.agChecked);
            } else if (cb.classList.contains(this.agIndet)) {
                  cb.classList.remove(this.agIndet);
                  cb.classList.add(this.agChecked);
            } else {
                  cb.classList.add(this.agChecked);
            }

            // Set side effects
            let selectAllCb = this.cbWrapperMap[this.selectAll];
            if (level === this.selectAll) {
                  // Set normal ones based on "Select All"
                  let checking = selectAllCb.classList.contains(this.agChecked);
                  Object.entries(this.cbWrapperMap).forEach(([_, val]) => {
                        let el = val as HTMLDivElement;
                        if (checking && !el.classList.contains(this.agChecked)) {
                              el.classList.add(this.agChecked);
                        } else if (!checking && el.classList.contains(this.agChecked)) {
                              el.classList.remove(this.agChecked);
                        }
                  });
            } else {
                  // Set "Select All"
                  let levelWrappers = Object.entries(this.cbWrapperMap).filter(([key, _]) => key !== this.selectAll);
                  let checkedCnt = levelWrappers.filter(([_, val]) => (val as HTMLDivElement).classList.contains(this.agChecked)).length;
                  if (checkedCnt === 0) {
                        selectAllCb.classList.remove(this.agChecked);
                        selectAllCb.classList.remove(this.agIndet);
                  } else if (checkedCnt < levelWrappers.length) {
                        selectAllCb.classList.remove(this.agChecked);
                        selectAllCb.classList.add(this.agIndet);
                  } else {
                        selectAllCb.classList.add(this.agChecked);
                        selectAllCb.classList.remove(this.agIndet);
                  }
            }

            // Save off final values
            Object.keys(Level).forEach(level => {
                  this.levelSelections[Level[level]] = this.cbWrapperMap[level].classList.contains(this.agChecked);
            });

            // Tell grid we changed
            this.initParams.filterChangedCallback();
      }

      isFilterActive(): boolean {
            return Object.entries(this.levelSelections).filter(([_, val]) => !val).length > 0;
      }

      doesFilterPass(params) {
            return this.levelSelections[params.data.Level];
      }

      getModel() {
      }

      setModel() {
      }

      onNewRowsLoaded() {
            // Reset and recompute the count of each level
            Object.keys(this.levelCounts).forEach(key => {
                  this.levelCounts[key] = 0;
            });
            this.initParams.api.forEachLeafNode(row => {
                  this.levelCounts[row.data.Level]++;
            });

            // Set the labels in the filter
            Object.keys(Level).forEach(level => {
                  (this.eGui.querySelector(`#${level}Lbl`) as HTMLDivElement).innerText = `${Level[level]} (${this.levelCounts[Level[level]]})`;
            });
      }
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
            const headerRegex = /(.*)?(trce|dbug|warn|fail|crit|info): (.*)\[([0-9]+)\] ?(.*)/;
            let lines = input.split(/\r?\n/).filter(x => !/^\s*$/.test(x)).map(x => x.replace(/(\x1b)\[[0-9]+m/g, ''));

            let alertedSingleLine = false;
            let scopesVisible = false;
            let timestampVisible = false;

            let currentEntry = new Log();
            let entries: Log[] = [];
            let currentIndex = 1;
            lines.forEach(line => {
                  if (/^\s+=>/.test(line)) {
                        // Scope line
                        scopesVisible = true;

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
                        
                        let timestamp = getTimestamp(parts[1]);
                        if (!!timestamp) {
                              timestampVisible = true;
                        }

                        currentEntry = new Log();
                        currentEntry.Order = currentIndex++;
                        currentEntry.Timestamp = timestamp;
                        currentEntry.Level = Level[parts[2]];
                        currentEntry.Type = parts[3];
                        currentEntry.EventId = parseInt(parts[4]);
                        currentEntry.MessageLines = [];
                        currentEntry.Scopes = [];

                        // This is a "single line" entry. Header and message are on same line.
                        if (!!parts[5]) {
                              if (!alertedSingleLine) {
                                    alert('Your logs are in "Single Line" mode.\nThere is no reliable way to separate scopes from the message, so they are both included in the Message field.\nSee the "About" page for more details.');
                                    alertedSingleLine = true;
                              }

                              currentEntry.MessageLines.push(parts[5]);
                        }
                  }
            });

            // Last entry never gets pushed by the next header, so add it manually
            entries.push(currentEntry);

            gridOptions['columnApi'].setColumnVisible('Scopes', scopesVisible);
            gridOptions['columnApi'].setColumnVisible('Timestamp', timestampVisible);

            return entries;
      } catch (error) {
            clearFile();
            clearText();
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
            filter: LevelFilter
      },
      {
            field: 'Type',
            filter: 'agTextColumnFilter'
      },
      {
            field: 'EventId',
            filter: 'agNumberColumnFilter'
      },
      {
            field: 'Scopes',
            filter: 'agTextColumnFilter',
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