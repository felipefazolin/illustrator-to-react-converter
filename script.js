// Polyfill JSON (if necessary)
if (typeof JSON === "undefined") {
  JSON = {
      parse: function(sJSON) {
          return eval("(" + sJSON + ")");
      },
      stringify: (function() {
          var toString = Object.prototype.toString;
          var isArray =
              Array.isArray ||
              function(a) {
                  return toString.call(a) === "[object Array]";
              };
          var escMap = {
              '"': '\\"',
              "\\": "\\\\",
              "\b": "\\b",
              "\f": "\\f",
              "\n": "\\n",
              "\r": "\\r",
              "\t": "\\t",
          };
          var escFunc = function(m) {
              return (
                  escMap[m] ||
                  "\\u" + (m.charCodeAt(0) + 0x10000).toString(16).substr(1)
              );
          };
          var escRE = /[\\"\u0000-\u001F\u2028\u2029]/g;
          return function stringify(value) {
              if (value == null) {
                  return "null";
              } else if (typeof value === "number") {
                  return isFinite(value) ? value.toString() : "null";
              } else if (typeof value === "boolean") {
                  return value.toString();
              } else if (typeof value === "object") {
                  if (typeof value.toJSON === "function") {
                      return stringify(value.toJSON());
                  } else if (isArray(value)) {
                      var res = "[";
                      for (var i = 0; i < value.length; i++)
                          res += (i ? ", " : "") + stringify(value[i]);
                      return res + "]";
                  } else if (toString.call(value) === "[object Object]") {
                      var tmp = [];
                      for (var k in value) {
                          if (value.hasOwnProperty(k))
                              tmp.push(stringify(k) + ": " + stringify(value[k]));
                      }
                      return "{" + tmp.join(", ") + "}";
                  }
              }
              return '"' + value.toString().replace(escRE, escFunc) + '"';
          };
      })(),
  };
}

// Function to get the coordinates of an object
function getCoordinates(obj) {
  var bounds = obj.geometricBounds;
  var coordinates = {
      x: bounds[0],
      y: bounds[1],
      width: bounds[2] - bounds[0],
      height: bounds[1] - bounds[3], // Height is measured from bottom to top instead of top to bottom
  };
  return coordinates;
}

// Function to export a layer to PNG
function exportLayerToPNG(layer, folderPath) {
  // Criar uma nova área de trabalho para a camada atual
  var tempDoc = app.documents.add(DocumentColorSpace.RGB, layer.width, layer.height);
  var tempLayer = layer.duplicate(tempDoc, ElementPlacement.INSIDE);

  // Exportar a nova área de trabalho para PNG
  var exportOptions = new ExportOptionsPNG24();
  var file = new File(folderPath + "/" + layer.name + ".png");
  exportOptions.transparency = true;
  tempDoc.exportFile(file, ExportType.PNG24, exportOptions);

  // Fechar a nova área de trabalho sem salvar as alterações
  tempDoc.close(SaveOptions.DONOTSAVECHANGES);
}

// Function to convert a group to a JSON object
function groupToJSON(group, zIndex, folderPath) {
  var json = {};

  // Get the group name
  json.name = group.name;

  // Set the z-index of the group
  json.zIndex = zIndex;

  // Check if the group contains subgroups or layers
  if (group.pageItems.length > 0) {
      json.layers = [];
      for (var i = 0; i < group.pageItems.length; i++) {
          var item = group.pageItems[i];
          if (item.typename === "GroupItem") {
              json.layers.push(groupToJSON(item, zIndex, folderPath));
          } else {
              var layer = {
                  name: item.name,
                  coordinates: getCoordinates(item),
                  zIndex: zIndex,
              };
              json.layers.push(layer);

              // Export the layer to PNG
              exportLayerToPNG(item, folderPath);
          }
      }
  }

  return json;
}

// Main function
function main() {
  var doc = app.activeDocument;

  // Select all groups
  var selection = doc.selection;
  if (selection.length === 0) {
      alert("No object selected!");
      return;
  }

  var folderPath = File($.fileName).path + "/images";
  var folder = new Folder(folderPath);
  if (!folder.exists) {
      folder.create();
  }

  var jsonData = [];
  for (var j = 0; j < selection.length; j++) {
      var group = selection[j];
      var groupData = groupToJSON(group, j, folderPath);
      jsonData.push(groupData);
  }

  // Save the JSON in the same directory as the script
  var filePath = File($.fileName).path + "/coordinates.json";
  var file = new File(filePath);
  file.open("w");
  file.write(JSON.stringify(jsonData));
  file.close();

  alert("JSON saved successfully at Desktop/coordinates.json");
}

// Execute the script
main();
