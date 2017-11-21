var fs = require("fs");
var csv = require("fast-csv");
var rp = require("request-promise");
var http = require("http");
const exec = require("child_process").exec;
const each = require("async").each;

// you can replace those with anything other packages as long as they do your job.

//env setup

var Script = {
  // preparation stage
  // Make sure at least empty file exist to not get error later on.
  createEmptyFile: function(path) {
    return new Promise(function(fulfill, reject) {
      try {
        var fd = fs.openSync(path, "a");
        fs.closeSync(fd);
        fulfill(true);
      } catch (ex) {
        errHandler(ex);
        reject(ex);
      }
    });
  },

  // take path to .sh script and take path to read from and saveTo. {String}
  // Based on picture url it sorts csv and reduce it to uniq items.
  // removes readFrom after it is done and return count of lines in new csv.
  sortByPictureTakeUniq: function(scriptBase, readFrom, saveTo) {
    return new Promise(function(fulfill, reject) {
      exec(
        `${scriptBase}sortreduce.sh ${readFrom} ${saveTo}`,
        (error, stdout, stderr) => {
          if (error) {
            errHandler(error);
            reject(error);
          }
          fulfill(stdout);
        }
      );
    });
  },

  // find items which were deleted in new file.
  // compares old and new one and save result id in new file.
  // @TODO dedlimiter is " so if you change delimeter in csv you have to change this as well !!!!
  findRemovedItems: function(scriptBase, oldFile, newFile, saveTo) {
    return new Promise(function(fulfill, reject) {
      exec(
        `${scriptBase}findremoved.sh ${oldFile} ${newFile} ${saveTo} ${scriptBase}`,
        (error, stdout, stderr) => {
          if (error) {
            errHandler(error);
            reject(error);
          }
          fulfill(stdout);
        }
      );
    });
  },

  // This function is shell command to sort and compare two csv files and return new one.
  //comm -13 <(sort new.csv| uniq) <(sort old.csv | uniq) > diff.csv
  // https://ss64.com/bash/comm.html
  // @params :scriptPath -> path to script compare.sh
  // @params :path -> path is new path of the newly downloaded file
  // @params :olpath -> path of the old saved file
  // @params :updpath -> updaoted path. this path is for items which are sending to api.
  compare: function(scriptPath, pathOld, path, upsertPath) {
    return new Promise(function(fulfill, reject) {
      exec(
        `${scriptPath}compare.sh ${pathOld} ${path} ${upsertPath}`,
        (error, stdout, stderr) => {
          if (error) {
            errHandler(error);
            reject(error);
          }
          fulfill(stdout);
        }
      );
    });
  },

  // Clean up files. so we have only one left at the end.
  // move new to old one so next script is working with updated data.
  cleanRenameDelete: function(
    scriptBase,
    pathOld,
    path,
    pathRemoved,
    pathUpsert
  ) {
    return new Promise(function(fulfill, reject) {
      exec(
        `${scriptBase}cleanup.sh ${pathOld} ${path} ${pathRemoved} ${pathUpsert}`,
        (error, stdout, stderr) => {
          if (error) {
            errHandler(error);
            reject(error);
          }
          fulfill(true);
        }
      );
    });
  },

  // get size of csv
  //@params :path -> {String}.
  getSize: function(path) {
    return new Promise(function(fulfill, reject) {
      fs.stat(path, function(err, stats) {
        if (err) {
          fulfill(0);
        } else {
          fulfill(stats.size);
        }
      });
    });
  },

  //download file
  //@param :path -> {String} path for saving file..
  download: function(url, path) {
    return new Promise(function(fulfill, reject) {
      var file = fs.createWriteStream(path);
      var request = http
        .get(url, function(response) {
          response.pipe(file);
          file.on("finish", function() {
            file.close(function() {
              fulfill(true);
            }); // close() is async, call cb after close comple
          });
        })
        .on("error", function(err) {
          fs.unlink(path);
          if (err) reject(err.message);
        });
    });
  },

  // Processing csv file
  //:param - > path updated path of the products (updpath)
  //(only once who are supposte to be updated)

  processCsv: function(variables) {
    var i = 0;

    var processing = function(id, cb) {
      var promises = [];
      var stream = fs.createReadStream(path);
      // csv.fromStream(stream, {
      //     headers: ["id", "name", "price"]
      // csv.fromStream(stream, {headers: true}).transform(function(data, next) {
      csv
        .fromStream(stream, header)
        .transform(function(data, next) {
          // promises.push here
          // process promises if count is >100 otherwise proceed to next proccessed data
          // console.log(data);
          if (promises.length > 100) {
            each(
              promises,
              (promise, callback) => {
                promise.then(data => callback()).catch(err => callback(err));
              },
              err => {
                //don't forget to reser array
                if (err) cb(err);
                promises = [];
                next(null, data);
              }
            );
          } else {
            next(null, data);
          }
        })
        .on("data", function(data) {
          // just dummy counter to know how many were updated. and make sure count is same as count of cvs lines
          i++;
        })
        .on("end", function() {
          log("Total: " + i);
          cb(null, true);
        });
    };
  }
};

//TOOLS

// API CALLS

//save errors to log file
function errHandler(err) {
  log(err.stack);
  return err;
}

// example of log to file instead of console.log()
// method for saving log to file.
// under 'log/example.log'
function log(path, text) {
  fs.appendFile(path, text + "\n", err => {});
}

module.exports = Script;
