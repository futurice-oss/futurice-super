'use strict';

var credentials = require('./salesforce-credentials.js'),
  jsforce = require('jsforce'),
  _ = require('underscore'),
  nano = require('nano')('http://localhost:5984'),
  dbName = 'futurice-super',
  database = nano.use(dbName),
  conn = new jsforce.Connection({}),
  zeropad,
  createDatabase,
  insertDocument,
  addOrUpdateDocument,
  addViews,
  opportunities = [];

/*
 * Utilities.
 */
zeropad = function(number, length){

  var numString = number+"";

  if (numString.length >= length) {
    return numString;
  } else {
    return zeropad("0"+numString, length);
  }

};

/*
 * CouchDB logic.
 */
createDatabase = function(successCallback, errorCallback){
  return nano.db.create(dbName, function(err, body){
    if (err){
      errorCallback(err, body);
    } else {
      addViews();
      successCallback();
    }
  });
};

addViews = function(){
  var designDocuments = [
        {
          _id: "_design/views",
          views: {
            all: {
              map: "function(doc) {emit(doc._id, doc)}"
            }
          }
        }
    ];

  _.each(designDocuments, function(doc){
    console.log("Adding design document: ", doc._id);
    database.insert(doc, doc._id);
  });
};

addOrUpdateDocument = function(doc, successCallback, errorCallback) {
  // Get existion document to get current revision.
  database.get(doc.Id, function(err, body){
    if (err) {
      if (err.reason === 'missing'){
        // New document
        database.insert(doc, doc.Id, successCallback, errorCallback);

      } else {
        console.log(err);
        if (typeof errorCallback === 'function'){
          errorCallback(err, body);
        }
      }
    } else {

      // Existing document, specify revision.
      doc._rev = body._rev;

      // Check for actual changes.
      doc._id = doc.Id;
      if (!_.isEqual(doc, body)){
        database.insert(doc, doc.Id, successCallback, errorCallback);
      } else {
        console.log("Skip identical: " + doc.Name);
      }
    }
  });
};

/*
 * Salesforce logic.
 */
conn.login(credentials.user, credentials.passwordtoken, function(err, userInfo) {
  if (err) { return console.error(err); }

  console.log("Bearer " + conn.accessToken);

  console.log(conn.instanceUrl);

  console.log("User ID: " + userInfo.id);
  console.log("Org ID: " + userInfo.organizationId);

  var closed_date = new Date(new Date() - (3*30*24*60*60*1000)); // Months, Days, Hours...
  var dateArray = [
    closed_date.getFullYear(),
    zeropad(closed_date.getUTCMonth()+1, 2),
    zeropad(closed_date.getUTCDay(), 2)
  ];
  var date = dateArray.join('-');


console.log("Querying Salesforce.");

conn.query('SELECT Id, Name, Account.Name, Description, Amount, CloseDate, Probability, StageName, IsClosed, IsWon, Type FROM Opportunity WHERE CloseDate > ' + date, function(err, res) {
    if (err) { return console.error(err); }

    // Information about objects here:
    // http://www.salesforce.com/us/developer/docs/api/Content/sforce_api_objects_opportunity.htm

    opportunities = res.records.map(function(opportunity){
      var temporaryOp = opportunity;
      temporaryOp.Account = temporaryOp.Account.Name;
      delete temporaryOp.attributes;
      return temporaryOp;
    });

    console.log('Done: ' + res.done);
    console.log("Fetched Opportunities from Salesforce.");

    var addOpportunities = function(){
      console.log("Adding Opportunities to CouchDB.");
          _.each(opportunities, function(opportunity){
            addOrUpdateDocument(opportunity, function(){
              console.log(opportunity.Name);
            }, function(err){
              console.log(err);
            });
          });
    };

    console.log("Checking for database.");
    createDatabase(function(){
      console.log("Database created successfully.");
      addOpportunities();
    }, function(err){
          if (err.error === 'file_exists') {
            console.log("Database exists.");
            addOpportunities();
          } else {
            console.log(err);
          }
    });

  });
});



