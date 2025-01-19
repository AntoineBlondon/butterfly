import sys
from js import document
class Output:
    def __init__(self):
        self.output = ""

    def write(self, text):
        output_div = document.getElementById("output")
        output_div.innerHTML += text

    def flush(self):
        output_div = document.getElementById("output")
        output_div.textContent = self.output

sys.stdout = Output()
sys.stderr = Output()