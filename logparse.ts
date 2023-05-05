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
                  gridOptions['api'].setFilterModel(null);
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
            gridOptions['api'].setFilterModel(null);
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
            const headerRegex = /(.*)??((?:\x1b\[[0-9]+m)*(?:trce|dbug|warn|fail|crit|info)(?:\x1b\[[0-9]+m)*): (.*)\[([0-9]+)\] ?(.*)/;
            let lines = input.split(/\r?\n/).filter(x => !/^\s*$/.test(x));

            let alertedSingleLine = false;
            let scopesVisible = false;
            let timestampVisible = false;
            let hasEntry = false;

            let currentEntry = new Log();
            currentEntry.MessageLines = [];
            let entries: Log[] = [];
            let currentIndex = 1;

            for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
                  let line = lines[lineIdx];

                  // Scope line
                  if (/^\s+=>/.test(line)) {
                        if (hasEntry) {
                              scopesVisible = true;
                              currentEntry.Scopes = line.split('=>').map(x => x.trim()).filter(Boolean);
                        }

                  }
                  // Message line
                  else if (/^\s+/.test(line)) {
                        if (hasEntry) {
                              currentEntry.MessageLines.push(line.trim());
                        }
                  }
                  // Header line
                  else {
                        let parts = line.match(headerRegex);

                        if (parts !== null) {
                              if (hasEntry) {
                                    currentEntry.Order = currentIndex++;
                                    entries.push(currentEntry);
                              }

                              hasEntry = true;

                              let timestamp = getTimestamp(parts[1]);
                              if (!!timestamp) {
                                    timestampVisible = true;
                              }

                              currentEntry = new Log();
                              currentEntry.Timestamp = timestamp;
                              currentEntry.Level = Level[parts[2].replace(/\x1b\[[0-9]+m/g, '')];
                              currentEntry.Type = parts[3];
                              currentEntry.EventId = parseInt(parts[4]);
                              currentEntry.MessageLines = [];
                              currentEntry.Scopes = [];

                              // This is a "single line" entry. Header and message are on same line.
                              if (!!parts[5]) {
                                    if (!alertedSingleLine) {
                                          alert('Your logs are in "Single Line" mode.\nThere is no reliable way to separate scopes from the message, so they are both included in the Message field.\nSee the "Help / About" page for more details.');
                                          alertedSingleLine = true;
                                    }

                                    currentEntry.MessageLines.push(parts[5]);
                              }
                        } 
                        else {
                              try {
                                    let entry = JSON.parse(line);
                                    if (
                                          entry["EventId"] !== undefined &&
                                          entry["LogLevel"] !== undefined &&
                                          entry["Category"] !== undefined &&
                                          entry["Message"] !== undefined
                                    ) {
                                          if (hasEntry) {
                                                currentEntry.Order = currentIndex++;
                                                entries.push(currentEntry);
                                          }

                                          hasEntry = true;

                                          currentEntry = new Log();
                                          currentEntry.Timestamp = null;
                                          currentEntry.Level = entry["LogLevel"];
                                          currentEntry.Type = entry["Category"];
                                          currentEntry.EventId = entry["EventId"];
                                          currentEntry.MessageLines = [];
                                          currentEntry.Scopes = [];

                                          currentEntry.MessageLines.push(...entry["Message"].split('\r\n'));
                                          
                                          if (entry["Timestamp"] !== undefined){
                                                let timestamp = getTimestamp(entry["Timestamp"]);
                                                if (!!timestamp) {
                                                      timestampVisible = true;
                                                      currentEntry.Timestamp = timestamp;
                                                }  
                                          }

                                          if (entry["Scopes"] !== undefined) {
                                                entry["Scopes"].forEach(scopeEntry => {
                                                      if (scopeEntry["Message"] !== undefined) {
                                                            scopesVisible = true;
                                                            currentEntry.Scopes.push(scopeEntry["Message"]);
                                                      } else if (typeof scopeEntry === 'string') {
                                                            scopesVisible = true;
                                                            currentEntry.Scopes.push(scopeEntry);
                                                      }
                                                });
                                          }
                                    }
                              }
                              catch (e) {
                                    // Wasn't JSON
                              }
                        }
                  }
            }

            // Last entry never gets pushed by the next header, so add it manually
            if (hasEntry) {
                  currentEntry.Order = currentIndex++;
                  entries.push(currentEntry);
            }

            // We never got any entries, so it was a bad format.
            if (currentIndex == 1) {
                  throw "Invalid format";
            }

            gridOptions['columnApi'].setColumnVisible('Scopes', scopesVisible);
            gridOptions['columnApi'].setColumnVisible('Timestamp', timestampVisible);

            scrollToGrid();
            return entries;
      } catch (error) {
            clearFile();
            clearText();
            openCloseModal('helpModal', true);
            return [];
      }
}

function scrollToGrid() {
      setTimeout(() => {
            document.getElementById('grid').scrollIntoView({behavior: "smooth", block: "start", inline: "nearest"});
      }, 0);
}

function makeGridFullScreen() {
      document.getElementById('grid').requestFullscreen();
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

function openCloseModal(id: string, open: boolean) {
      let modal = document.getElementById(id) as HTMLDivElement;
      if (!!modal) {
            modal.style.display = open ? "block" : "none";
            document.body.style.overflow = open ? "hidden" : "unset";
      }
}

const normalTerminalValues = [0, 1, 22, 4, 24, /*7, 27, */30, 31, 32, 33, 34, 35, 36, 37, /*38, */39, 40, 41, 42, 43, 44, 45, 46, 47, /*48, */49, 90, 91, 92, 93, 94, 95, 96, 97, 100, 101, 102, 103, 104, 105, 106, 107];

function formatString(input: string) {
      let fore: string = null;
      let back: string = null;
      let underline: boolean = false;
      let bright: boolean = false;

      let inTerminalSequence: boolean = false;

      let output = '<span>';
      for (let inputIdx: number = 0; inputIdx < input.length; inputIdx++) {
            if (input[inputIdx] === '\x1b' && input[inputIdx + 1] === '[') {
                  let codeStr: string = '';
                  let codeIdx: number = 1;
                  while (!isNaN(+input[inputIdx + 1 + codeIdx]) || input[inputIdx + 1 + codeIdx] === ';') {
                        codeStr += input[inputIdx + 1 + codeIdx];
                        codeIdx++;
                  }
                  let parts = codeStr.split(';').map(x => Number.parseInt(x)).filter(x => !isNaN(x));
                  if (
                        input[inputIdx + 1 + codeIdx] === 'm' &&
                        (parts.length === 1 && normalTerminalValues.includes(parts[0])) ||
                        (parts.length === 5 && parts[0] === 38 && parts[1] === 2) ||
                        (parts.length === 5 && parts[0] === 48 && parts[1] === 2) ||
                        (parts.length === 3 && parts[0] === 38 && parts[1] === 5) ||
                        (parts.length === 3 && parts[0] === 48 && parts[1] === 5)
                  ) {
                        switch (parts[0]) {
                              // Reset
                              case 0:
                                    fore = null;
                                    back = null;
                                    underline = false;
                                    break;
                              // Bold/bright modifiers
                              case 1:
                                    bright = true;
                                    break;
                              case 22:
                                    bright = false;
                                    break;
                              // Underline modifiers
                              case 4:
                                    underline = true;
                                    break;
                              case 24:
                                    underline = false;
                                    break;
                              // Foreground colors
                              case 30:
                                    fore = (bright ? 'bright-' : '') + 'black';
                                    break;
                              case 31:
                                    fore = (bright ? 'bright-' : '') + 'red';
                                    break;
                              case 32:
                                    fore = (bright ? 'bright-' : '') + 'green';
                                    break;
                              case 33:
                                    fore = (bright ? 'bright-' : '') + 'yellow';
                                    break;
                              case 34:
                                    fore = (bright ? 'bright-' : '') + 'blue';
                                    break;
                              case 35:
                                    fore = (bright ? 'bright-' : '') + 'magenta';
                                    break;
                              case 36:
                                    fore = (bright ? 'bright-' : '') + 'cyan';
                                    break;
                              case 37:
                                    fore = (bright ? 'bright-' : '') + 'white';
                                    break;
                              case 38:
                                    if (parts[1] === 2) {
                                          fore = `rgb(${parts[2]}, ${parts[3]}, ${parts[4]})`;
                                    } else if (parts[1] === 5) {
                                          fore = `xterm-${parts[2]}`;
                                    }
                                    break;
                              case 39:
                                    fore = null;
                                    break;
                              // Background colors
                              case 40:
                                    back = 'black';
                                    break;
                              case 41:
                                    back = 'red';
                                    break;
                              case 42:
                                    back = 'green';
                                    break;
                              case 43:
                                    back = 'yellow';
                                    break;
                              case 44:
                                    back = 'blue';
                                    break;
                              case 45:
                                    back = 'magenta';
                                    break;
                              case 46:
                                    back = 'cyan';
                                    break;
                              case 47:
                                    back = 'white';
                                    break;
                              case 48:
                                    if (parts[1] === 2) {
                                          back = `rgb(${parts[2]}, ${parts[3]}, ${parts[4]})`;
                                    } else if (parts[1] === 5) {
                                          back = `xterm-${parts[2]}`;
                                    }
                                    break;
                              case 49:
                                    back = null;
                                    break;
                              // Bold/bright foreground colors
                              case 90:
                                    fore = 'bright-black';
                                    break;
                              case 91:
                                    fore = 'bright-red';
                                    break;
                              case 92:
                                    fore = 'bright-green';
                                    break;
                              case 93:
                                    fore = 'bright-yellow';
                                    break;
                              case 94:
                                    fore = 'bright-blue';
                                    break;
                              case 95:
                                    fore = 'bright-magenta';
                                    break;
                              case 96:
                                    fore = 'bright-cyan';
                                    break;
                              case 97:
                                    fore = 'bright-white';
                                    break;
                              // Bold/bright background colors
                              case 100:
                                    back = 'bright-black';
                                    break;
                              case 101:
                                    back = 'bright-red';
                                    break;
                              case 102:
                                    back = 'bright-green';
                                    break;
                              case 103:
                                    back = 'bright-yellow';
                                    break;
                              case 104:
                                    back = 'bright-blue';
                                    break;
                              case 105:
                                    back = 'bright-magenta';
                                    break;
                              case 106:
                                    back = 'bright-cyan';
                                    break;
                              case 107:
                                    back = 'bright-white';
                                    break;
                              default:
                                    break;
                        }

                        inTerminalSequence = true;
                        inputIdx = inputIdx + 1 + codeIdx;

                        continue;
                  }
            }

            // We just exited a terminal sequence. Close old span and open a new one.
            if (inTerminalSequence) {
                  let styleString = '';
                  if (!!fore) {
                        if (fore.startsWith('rgb(')) {
                              styleString += `color: ${fore};`;
                        } else {
                              styleString += `color: var(--${fore});`;
                        }
                  }
                  if (!!back) {
                        if (back.startsWith('rgb(')) {
                              styleString += `background-color: ${back};`;
                        } else {
                              styleString += `background-color: var(--${back});`;
                        }
                  }
                  if (underline) {
                        styleString += 'text-decoration: underline;'
                  }

                  if (styleString == '') {
                        output += '</span><span>';
                  } else {
                        output += `</span><span style="${styleString}">`;
                  }
            }

            inTerminalSequence = false;
            output += input[inputIdx];
      }

      return output + '</span>';
}

const columnDefs = [
      {
            field: 'Order',
            filter: 'agNumberColumnFilter'
      },
      {
            field: 'Timestamp',
            filter: 'agDateColumnFilter',
            filterParams: {
                  inRangeInclusive: true,
                  comparator: (filterValue: Date, cellValue: Date) => {
                        let cellNoTime = new Date(cellValue);
                        cellNoTime.setHours(0, 0, 0, 0);
                        if (cellNoTime < filterValue) {
                              return -1;
                        } else if (cellNoTime > filterValue) {
                              return 1;
                        }
                        return 0;
                  }
            }
      },
      {
            field: 'Level',
            filter: LevelFilter
      },
      {
            field: 'Type',
            filter: 'agTextColumnFilter',
            cellRenderer: function (param) {
                  return param.data.Type.split('\n').join('<br>')
            }
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
                  //return formatString(param.data.MessageLines.join('<br>'));
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
      rowData: [],
      // getRowStyle: params => {
      //       if (params.data.Level === undefined) {
      //             return { background: 'yellow' };
      //       }
      // }
};

// setup the grid after the page has finished loading
document.addEventListener('DOMContentLoaded', () => {
      const gridDiv = document.querySelector('#logsGrid');
      new window['agGrid'].Grid(gridDiv, gridOptions);
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            setDarkLight(true);
      }
});

document.addEventListener("fullscreenchange", () => {
      let fullScreenButton = document.getElementById('fullScreenButton');
      if (document.fullscreenElement) {
            fullScreenButton.style.visibility = "hidden";
      } else {
            fullScreenButton.style.visibility = "visible";
      }
});

// Listen to dark mode/light mode changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
      setDarkLight(e.matches);
});

// Close modal when clicking outside
window.onclick = function (event) {
      if (event.target == document.getElementById('helpModal')) {
            openCloseModal('helpModal', false)
      }
}