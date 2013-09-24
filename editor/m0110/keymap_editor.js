/*
 * TMK keymap editor
 */
// key id under editing
var editing_key;
// layer under editing
var editing_layer = 0;

// load keymap on keyboard key buttons
var load_keymap_on_keyobard = function(layer, keymap) {
    for (var row in keymap) {
        for (var col in keymap[row]) {
            var code = keymap[row][col];
            var key = keycodes[code];
            // row and column takes range of 0-32(0-9a-v)
            $("#key-" + parseInt(row).toString(32) + parseInt(col).toString(32)).text(key.name);
            $("#key-" + parseInt(row).toString(32) + parseInt(col).toString(32)).attr({ title: key.desc });
        }
    }
};

$(function() {
    // Title
    document.title = "TMK Keymap Editor for " + KEYBOARD_ID;
    $("#page-title").text("TMK Keymap Editor for " + KEYBOARD_ID);

    /* 
     * load keymap from URL hash
     */
    var decoded = decode_keymap(document.location.hash.substring(1));
    if (decoded != null) {
        keymaps = decoded['keymaps'];
    }



    /*
     * Layer selector
     */
    $("#layer_radio").buttonset();

    // layer change
    $(".layer").click(function(ev, ui) {
        var layer = parseInt($(this).attr('id').match(/layer-(\d+)/)[1]);
        editing_layer = layer;
        load_keymap_on_keyobard(layer, keymaps[layer]);
    });



    /*
     * Keyboard(key buttons)
     */
    // load default keymap on startup
    load_keymap_on_keyobard(0, keymaps[0]);

    // Select key button to edit
    $(".key").click(function(ev, ui) {
        editing_key = $(this).attr('id');

        // grey-out key to indicate being under editing
        $(".key").removeClass("key-editing");
        $(this).addClass("key-editing");
    }).focus(function(ev, ui) {
        // select editing_key with tab key focus
        $(this).click();
    });



    /*
     * Keycodes button tab
     */
    $("#keycode_tabs").tabs({
        heightStyle: "auto",
    });

    // Keycodes: read name and description from code table
    $(".action").each(function(index) {
        // get code from code button id: code-[0x]CCCC where CCCC is dec or hex number
        var code = parseInt($(this).attr('id').match(/code-((0x){0,1}[0-9a-fA-F]+)/)[1]);
        $(this).text(keycodes[code].name);
        $(this).attr({ title: keycodes[code].desc });
        //console.log(index + ": " + code + " " + keycodes[code].desc);
    });

    $(".action").click(function(ev,ui) {
        console.log("action click");
        if (!editing_key) return;

        // get matrix position from key id: key-RC where R is row and C is column in "0-v"(radix 32)
        var pos = editing_key.match(/key-([0-9a-v])([0-9a-v])/i);
        if (!pos) return;
        var row = parseInt(pos[1], 32), col = parseInt(pos[2], 32);

        // set text and tooltip to key button under editing
        $("#" + editing_key).text($(this).text());
        $("#" + editing_key).attr({ title: $(this).attr('title'), });

        // change keymap array
        // get code from keycode button id: code-[0x]CC where CC is dec or hex number
        var code = $(this).attr('id').match(/code-((0x){0,1}[0-9a-fA-F]+)/)[1];
        keymaps[editing_layer][row][col] = parseInt(code);

        // give focus on editing_key for next tab key operation
        $("#" + editing_key).focus();
    });


    /*
     * Share URL
     */
    // Share URL
    $("#keymap-share").click(function(ev, ui) {
        var hash = encode_keymap({ keymaps: keymaps });
        $("#share-url").text(document.location.origin + document.location.pathname + "#" + hash);
    });

    // Shorten URL
    $("#shorten-url").click(function(ev, ui) {
        var hash = encode_keymap({ keymaps: keymaps });
        var editor_url = document.location.origin + document.location.pathname;
        window.open("https://bitly.com/shorten/?url=" + encodeURIComponent(editor_url + "#" + hash));
        //window.open("http://tinyurl.com/create.php?url=" + encodeURIComponent(editor_url + "#" + hash));
    });


    // Hex Save
    $("#keymap-download").click(function(ev, ui) {
        var keymap_data = fn_actions.concat(keymaps);
        var content = firmware_hex() +
                      hex_output(KEYMAP_START_ADDRESS, keymap_data) +
                      hex_eof();

        // download hex file
        var blob = new Blob([content], {type: "application/octet-stream"});
        var hex_link = $("#hex-download");
        hex_link.attr('href', window.URL.createObjectURL(blob));
        hex_link.attr('download', KEYBOARD_ID + "_firmware.hex");
        // jQuery click() doesn't work straight for 'a' element
        // http://stackoverflow.com/questions/1694595/
        hex_link[0].click();
    });



    /*
     * Output options
     */
    //$("#keymap-output").resizable();  // resizable textarea

    // Hex output
    $("#keymap-hex-generate").click(function(ev, ui) {
        var keymap_data = fn_actions.concat(keymaps);
        $("#keymap-output").text(hex_output(KEYMAP_START_ADDRESS, keymap_data));
    });

    // C source output
    $("#keymap-source-generate").click(function(ev, ui) {
        $("#keymap-output").text(source_output(keymaps));
    });

    // JSON output
    //$("#keymap-json-generate").css('display', 'none');  // hide
    $("#keymap-json-generate").click(function(ev, ui) {
        var keymap_output;
        //keymap_output = JSON.stringify(keymaps, null, 4);
        keymap_output = JSON.stringify({ keymaps: keymaps });
        $("#keymap-output").text(keymap_output);
    });

    // encode keymap
    $("#keymap-encode").click(function(ev, ui) {
        var keymap_output = encode_keymap({ keymaps: keymaps });
        $("#keymap-output").text(keymap_output);
    });

    // decode  keymap
    $("#keymap-decode").click(function(ev, ui) {
        var hash = $("#keymap-output").text();
        var keymap_output = decode_keymap(hash);
        $("#keymap-output").text(JSON.stringify(keymap_output));
    });



    // lost keymap under edting when leave the page
    /* TODO: Needed when released
    $(window).bind('beforeunload', function(){
          return 'CAUTION: You will lost your change.';
    });
    */
});



/*
 * Share URL
 */
function encode_keymap(keymap)
{
    return window.btoa(JSON.stringify(keymap));
}

function decode_keymap(hash)
{
    try {
        return JSON.parse(window.atob(hash));
    } catch (err) {
        return null;
    }
}

/*
 * Hex file
 */
function hexstr2(b)
{
    return ('0'+ b.toString(16)).substr(-2).toUpperCase();
}

function hex_line(address, record_type, data)
{
    var sum = 0;
    sum += data.length;
    sum += (address >> 8);
    sum += (address & 0xff);
    sum += record_type;

    var line = '';
    line += ':';
    line += hexstr2(data.length);
    line += hexstr2(address >> 8);
    line += hexstr2(address & 0xff);
    line += hexstr2(record_type);
    for (var i = 0; i < data.length; i++) {
        sum = (sum + data[i]);
        line += hexstr2(data[i]);
    }
    line += hexstr2((~sum + 1)&0xff);  // Checksum
    line +="\r\n";
    return line;
}

function hex_eof()
{
    return ":00000001FF\r\n";
}

function hex_output(address, data) {
    var output = '';
    var line = [];

    // TODO: refine: flatten data into one dimension array
    [].concat.apply([], [].concat.apply([], data)).forEach(function(e) {
        line.push(e);
        if (line.length == 16) {
            output += hex_line(address, 0x00, line);
            address += 16;
            line.length = 0;   // clear array
        }
    });
    if (line.length > 0) {
        output += hex_line(address, 0x00, line);
    }
    return output;
}



/*
 * Source file
 */
function source_output(keymaps) {
    var output = '';
    // fn actions
    output += "/*\n";
    output += " * Keymap for " + KEYBOARD_ID + "\n";;
    output += " *   generated by tmk keymap editor\n";
    output += " */\n";
    output += "#include <stdint.h>\n";
    output += "#include <stdbool.h>\n";
    output += "#include <avr/pgmspace.h>\n";
    output += "#include \"keycode.h\"\n";
    output += "#include \"action.h\"\n";
    output += "#include \"action_macro.h\"\n";
    output += "#include \"keymap.h\"\n\n";

    output += "#ifdef KEYMAP_SECTION_ENABLE\n";
    output += "const uint16_t fn_actions[] __attribute__ ((section (\".keymap.fn_actions\"))) = {\n";
    output += "#else\n";
    output += "static const uint16_t fn_actions[] PROGMEM = {\n";
    output += "#endif\n";
    output += fn_actions_source;
    output += "};\n\n";

    // keymaps
    output += "#ifdef KEYMAP_SECTION_ENABLE\n";
    output += "const uint8_t keymaps[][";
    output += keymaps[0].length;         // row
    output += "][";
    output += keymaps[0][0].length;      // col
    output += "] __attribute__ ((section (\".keymap.keymaps\"))) = {\n";
    output += "#else\n";
    output += "static const uint8_t keymaps[][";
    output += keymaps[0].length;         // row
    output += "][";
    output += keymaps[0][0].length;      // col
    output += "] PROGMEM = {\n";
    output += "#endif\n";
    for (var i in keymaps) {
        output += "    {\n";
        for (var j in keymaps[i]) {
            output += "        { ";
            for (var k in keymaps[i][j]) {
                output += '0x' + ('0' + keymaps[i][j][k].toString(16)).substr(-2);
                output += ',';
            }
            output += " },\n";
        }
        output += "    },\n";
    }
    output += "};\n";
    output += "\n";
    output += "/* translates key to keycode */\n";
    output += "uint8_t keymap_key_to_keycode(uint8_t layer, key_t key)\n";
    output += "{\n";
    output += "    return pgm_read_byte(&keymaps[(layer)][(key.row)][(key.col)]);\n";
    output += "}\n";
    output += "\n";
    output += "/* translates Fn index to action */\n";
    output += "action_t keymap_fn_to_action(uint8_t keycode)\n";
    output += "{\n";
    output += "    action_t action;\n";
    output += "    action.code = pgm_read_word(&fn_actions[FN_INDEX(keycode)]);\n";
    output += "    return action;\n";
    output += "}\n";
    return output;
};