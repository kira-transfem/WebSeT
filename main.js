const encoder = new TextEncoder();
const decoder = new TextDecoder();

// Set default baudrate
var bd = 115200;
$(document).ready(function() { $('#baud').val(bd) });

// Set possible baudrates and add them to #baud
const baudrates = [50,75,110,134,150,200,300,600,1200,1800,2400,4800,9600,19200,28800,38400,57600,76800,115200,230400,460800,576000,921600];
baudrates.forEach(bd => {
    $("#baud").append(`<option value=${bd}>${bd}</option>`);
});

// When a new baudrate is selected..
$("#baud").change(function() {
    // Set bd to selection
    bd = $('#baud option:selected').text();
});

function addLine(text) {
    $('#term').append(`<p>${text}</p>`);
}

function lastLine() {
    return $('#term p:last');
}

var lastRowContents;
function processLineData(dat) {
    dat.forEach(B => {
        if (B == 10){
            addLine('');
            $('#term').scrollTop($('#term')[0].scrollHeight);
        } else {
            var lltxt = lastLine().text();
            lastRowContents = lltxt+String.fromCharCode(B)
            lastLine().text(lastRowContents);
        }
    });
}

var writer;
async function serialStart() {
    const port = await navigator.serial.requestPort();
    await port.open({baudRate: bd});
    const reader = port.readable.getReader();
    writer = port.writable.getWriter();

    try {
        while (1) {
            const {value, done} = await reader.read();
            if (done) {
                break;
            }
            processLineData(value);
        }
    } catch (error) {
        alert(error);
    } finally {
        reader.releaseLock();
        await writer.close();
    }
}

$("#portSelect").click(function() {
    serialStart();
    $('#portSelect').remove();
    $('header').append('<p class="inline"><a href="./index.html">Refresh page</a> to select new port.</p>');
});

var inputHistorySelection = -1;
var inputHistory = [new Uint8Array()];
var buffer = new Uint8Array();
$(document).ready(function() {
    $('#in').on('keypress', function(e) {
        $('#in').val('');
        $('#term').scrollTop($('#term')[0].scrollHeight);
        const nextBuffer = new Uint8Array(buffer.length+1);
        nextBuffer.set(buffer);
        nextBuffer[nextBuffer.length-1] = e.which;
        buffer = nextBuffer;
        lastLine().text(lastRowContents+decoder.decode(buffer));
        if (e.which === 13) {
            lastLine().text(lastRowContents);
            inputHistory.splice(0,0,buffer)
            writer.write(buffer);
            buffer = new Uint8Array();
            inputHistorySelection = -1
        }
    })
    $('#in').on('keydown', function(e){
        $('#in').val('');
        if (e.key == 'Backspace') {
            buffer = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.length-1);
            lastLine().text(lastRowContents+decoder.decode(buffer));
        }
        if (e.key == 'ArrowUp') {
            inputHistorySelection += 1;
            if (inputHistorySelection > inputHistory.length-1) {inputHistorySelection = inputHistory.length-1};
            buffer = inputHistory[inputHistorySelection];
        }
        if (e.key == 'ArrowDown') {
            inputHistorySelection -= 1;
            if (inputHistorySelection < -1) {inputHistorySelection = -1};
            buffer = inputHistory[inputHistorySelection];
            if (inputHistorySelection == -1) {buffer = new Uint8Array()};
        }
        lastLine().text(lastRowContents+decoder.decode(buffer));
    })
})
