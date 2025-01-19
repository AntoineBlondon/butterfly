let tabs = {}; // Store code content for each tab
let activeTabId = null; // Track the currently active tab

// Initialize CodeMirror editor
const codeMirrorEditor = CodeMirror.fromTextArea(document.getElementById("code"), {
    mode: "python", // Python syntax highlighting
    theme: "default", // Default theme (can be changed)
    lineNumbers: true, // Show line numbers
    indentUnit: 4, // Indent size
    tabSize: 4, // Tab size
    matchBrackets: true, // Highlight matching brackets
});

// Load Pyodide and initialize it
let pyodideReadyPromise = loadPyodide();

// Function to load an external Python file
async function loadPythonFile(pyodide, filePath) {
    const response = await fetch(filePath); // Fetch the file from the server
    const fileContent = await response.text(); // Read the content as text
    await pyodide.runPython(fileContent); // Execute the Python code
}

// Function to run the Python code
async function runCode() {
    const outputDiv = document.getElementById("output");

    // Clear previous output
    outputDiv.textContent = "";

    try {
        // Wait for Pyodide to initialize
        let pyodide = await pyodideReadyPromise;

        // Load the external Python file
        await loadPythonFile(pyodide, "./output_handler.py");

        // Get the code from the active tab's content
        const code = codeMirrorEditor.getValue();

        // Run the Python code
        const result = await pyodide.runPythonAsync(code);
    } catch (error) {
        // Display errors
        outputDiv.textContent = error.message;
    }
}

function createTab(content = null) {
    // if content is the click event
    if(content instanceof MouseEvent) {
        content = null;
    }
    if(content == null) {
        content = {
            name: "New Tab",
            content: "",
        };
    }

    const tabId = `tab-${Date.now()}`; // Unique ID for the tab

    // Initialize the tab in the tabs object
    tabs[tabId] = content;
    // Create the tab element
    const tab = document.createElement("div");
    tab.className = "tab";
    tab.id = tabId;

    // Add tab name
    const tabLabel = document.createElement("span");
    tabLabel.textContent = content.name;
    tab.appendChild(tabLabel);

    tabLabel.addEventListener("dblclick", () => {
        const newName = prompt("Enter a new name for the tab:", tabs[tabId].name);
        if (newName) {
            tabs[tabId].name = newName;
            tabLabel.textContent = newName;
        }
    });
    tab.addEventListener("click", () => {
        switchTab(tabId);
    });

    // Add a delete button to the tab
    const deleteButton = document.createElement("button");
    deleteButton.className = "delete-tab-button";
    deleteButton.textContent = "x";
    deleteButton.addEventListener("click", (e) => {
        e.stopPropagation(); // Prevent switching tabs when deleting
        deleteTab(tabId);
    });
    tab.appendChild(deleteButton);

    // Add the tab to the tabs container
    document.getElementById("tabs").appendChild(tab);

    // Switch to the new tab
    switchTab(tabId);
}


function switchTab(tabId) {
    if (!tabs.hasOwnProperty(tabId)) {
        console.error(`Tab with ID "${tabId}" does not exist.`);
        return;
    }

    // Save the current editor content to the active tab
    if (tabs.hasOwnProperty(activeTabId)) {
        tabs[activeTabId].content = codeMirrorEditor.getValue();
    }

    // Update the active tab
    activeTabId = tabId;

    // Highlight the active tab
    document.querySelectorAll(".tab").forEach((tab) => {
        tab.classList.remove("active");
    });

    const newActiveTab = document.getElementById(tabId);
    if (newActiveTab) {
        newActiveTab.classList.add("active");
    }

    // Load the content of the selected tab into the editor
    codeMirrorEditor.setValue(tabs[tabId].content || "");
}


// Delete a specific tab
// Delete a specific tab
function deleteTab(tabId) {
    // Remove the tab's content
    if (!tabs.hasOwnProperty(tabId)) {
        console.error(`Cannot delete tab. Tab with ID "${tabId}" does not exist in memory.`);
        return;
    }
    delete tabs[tabId];

    // Remove the tab element from the DOM
    const tabElement = document.getElementById(tabId);
    if (tabElement) {
        tabElement.parentNode.removeChild(tabElement);
    } else {
        console.error(`Cannot delete tab. Tab with ID "${tabId}" does not exist in the DOM.`);
    }

    // Switch to another tab if available
    const remainingTabs = Object.keys(tabs);
    if (remainingTabs.length == 0) {
        createTab();
    }
    switchTab(remainingTabs[0]); // Switch to the first remaining tab
}



// Snippet Management
const SNIPPET_STORAGE_KEY = "blue_code_snippets";

// Helper function to get snippets from localStorage
function getSnippets() {
    const snippets = localStorage.getItem(SNIPPET_STORAGE_KEY);
    return snippets ? JSON.parse(snippets) : {}; // Parse JSON or return an empty object
}

// Helper function to save snippets back to localStorage
function saveSnippets(snippets) {
    localStorage.setItem(SNIPPET_STORAGE_KEY, JSON.stringify(snippets)); // Save as JSON
}

// Save the current code snippet to localStorage
function saveSnippet() {
    const snippetName = document.getElementById("snippet-name").value.trim();
    const code = codeMirrorEditor.getValue();

    if (!snippetName) {
        alert("Please enter a snippet name.");
        return;
    }

    // Get existing snippets
    const snippets = getSnippets();

    // Check if the snippet name already exists
    if (snippets[snippetName] && !confirm(`Snippet "${snippetName}" already exists. Overwrite?`)) {
        return; // Abort if the user doesn't want to overwrite
    }

    // Add or update the snippet
    snippets[snippetName] = code;

    // Save updated snippets
    saveSnippets(snippets);

    // Update the snippet list
    updateSnippetList();
    alert(`Snippet "${snippetName}" saved!`);
}

// Load a snippet from localStorage
function loadSnippet() {
    const snippetList = document.getElementById("snippet-list");
    const snippetName = snippetList.value;

    if (!snippetName) {
        alert("Please select a snippet to load.");
        return;
    }

    // Get existing snippets
    const snippets = getSnippets();

    // Load the snippet into the editor
    const code = snippets[snippetName];
    if (code) {
        codeMirrorEditor.setValue(code);
    } else {
        alert(`Snippet "${snippetName}" not found.`);
    }
}

// Delete a snippet from localStorage
function deleteSnippet() {
    const snippetList = document.getElementById("snippet-list");
    const snippetName = snippetList.value;

    if (!snippetName) {
        alert("Please select a snippet to delete.");
        return;
    }

    // Get existing snippets
    const snippets = getSnippets();

    // Confirm deletion
    if (confirm(`Are you sure you want to delete the snippet "${snippetName}"?`)) {
        delete snippets[snippetName]; // Remove the snippet
        saveSnippets(snippets); // Save the updated list
        updateSnippetList(); // Update the dropdown
        alert(`Snippet "${snippetName}" deleted.`);
    }
}

// Update the snippet list dropdown
function updateSnippetList() {
    const snippetList = document.getElementById("snippet-list");
    snippetList.innerHTML = ""; // Clear existing options

    // Get existing snippets
    const snippets = getSnippets();

    // Add options for all saved snippets
    for (const snippetName in snippets) {
        const option = document.createElement("option");
        option.value = snippetName;
        option.textContent = snippetName;
        snippetList.appendChild(option);
    }
}





function importLesson(lessonJson) {
    // Clear existing tabs and editor content
    document.getElementById("tabs").innerHTML = ""; // Remove all tabs from the DOM
    tabs = {}; // Clear the tabs object
    activeTabId = null; // Reset the active tab
    codeMirrorEditor.setValue(""); // Clear the editor content

    // Display lesson title and description
    const lessonTitle = document.createElement("h2");
    lessonTitle.textContent = lessonJson.title;

    const lessonDescription = document.createElement("p");
    lessonDescription.textContent = lessonJson.description;

    const lessonHeader = document.querySelector("main section");
    lessonHeader.prepend(lessonDescription);
    lessonHeader.prepend(lessonTitle);

    // Create tabs for the lesson
    lessonJson.tabs.forEach(tab => {
        createTab({
            name: tab.name,
            content: tab.content,
        });

    });
    switchTab(Object.keys(tabs)[0]);
}
async function loadLessonFromFile(filePath) {
    const response = await fetch(filePath);
    const lessonJson = await response.json();
    importLesson(lessonJson);
}



// Initialize the snippet list and default tab on page load
document.addEventListener("DOMContentLoaded", () => {
    updateSnippetList();
    createTab(); // Create the first default tab
    loadLessonFromFile("lessons/dictionaries.json");
});

// Add event listeners
document.getElementById("add-tab-button").addEventListener("click", createTab);
document.getElementById("run-button").addEventListener("click", runCode);
document.getElementById("save-snippet-button").addEventListener("click", saveSnippet);
document.getElementById("load-snippet-button").addEventListener("click", loadSnippet);
document.getElementById("delete-snippet-button")?.addEventListener("click", deleteSnippet);
