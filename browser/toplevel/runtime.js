// Learning Lasair Runtime JavaScript
// This provides the interface between the OCaml toplevel and the web page

// Output capture for the REPL
var lasairOutput = [];

// Override caml_ml_output to capture output
if (typeof joo_global_object !== 'undefined') {
    // js_of_ocaml output handling
}

// Function to get and clear output
function getLasairOutput() {
    var result = lasairOutput.join('');
    lasairOutput = [];
    return result;
}
