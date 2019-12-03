function sendNotification() {
  //Created By Kennen Lawrence
  //Version 1.3.0 (Added MTD function and added new, non-counting team)
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ui = SpreadsheetApp.getUi();
  ss.getSheetByName('Shhhhh....').hideSheet();
  report();
  var mode = driver('mode'); //Mode 1 will send email to all; if number is set to 2, will put up maintenance alert.
  
  if (mode === 2) { //Create maintenance prompt and allow for override
    var overide = ui.prompt('Under Maintenance!', 'Down for maintenance! Will be up again shortly! :D', ui.ButtonSet.OK);
    
    if (overide.getResponseText().toLowerCase() !== 'override') return;
  }
  
  var input = ui.alert("Are you sure you'd like to send the notification?", ui.ButtonSet.YES_NO);
  
  if (input !== ui.Button.YES) {
    ss.toast('Action was cancelled! Email was not sent!', 'Cancelled');
    return;
  }
  
  //Start of main script
  if (!checkValidation()) {
    ss.toast('Action was cancelled! Email was not sent!', 'Cancelled');
    return;
  }
  
  var sheet = ss.getSheetByName('Main');
  var sheet2 = ss.getSheetByName('Recipients');
  var indvSheet = ss.getSheetByName('Individuals');
  var ranger = sheet2.getRange(1, mode, sheet2.getLastRow()).getDisplayValues();
  var range = indvSheet.getRange(2, 1, indvSheet.getLastRow() - 1, driver('mainColumns') + 1).getValues(); /* Gets values from "Main" sheet Ends on column before "Include" column */
  var info = sheet.getRange(1, driver('As of'), 6).getDisplayValues(); /* Gets 'Date', 'As Of', and MTD values */
  var includeIndv = indvSheet.getRange(2, driver('Include'), indvSheet.getLastRow() - 1, 3).getValues();
  var day = info[0][0];
  var asOf = info[2][0];
  var MTD = info[5][0];
  MTD = (MTD.toString().toUpperCase() === 'TRUE');
  
  for (var i = 0; i < includeIndv.length; i++) {
    if (day.split(' ')[0] === 'Saturday' && !MTD && includeIndv[i][2] !== driver('<31')) {
      includeIndv[i][2] = driver('31-60');
    }
    
    includeIndv[i][1] = includeIndv[i][1].toString().toUpperCase() === 'TRUE';
  }
  
  var subject = 'Outbound Activity ';
  
  if (MTD) subject += 'MTD ';
  
  subject += '- ' + day;
  
  var sender = getName();
  var body;
  var recipients = '';
  var check = false;
  var cti = [];
  var emails = [];
  var texts = [];
  var recv = [];
  var appts = [];
  var teams = teamInfo('Teams');
  
  for (i = 0; i < teams.length; i++) {
    cti[i] = emails[i] = texts[i] = recv[i] = appts[i] = 0;
  }
  
  for (var j = 0; j < teams.length; j++) {
    for (i = 0; i < range.length; i++) {
      if (includeIndv[i][1] && range[i][driver('mainColumns')] === teams[j] && includeIndv[i][2] !== driver('<31')) {
        cti[j] += range[i][2];
        emails[j] += range[i][1];
        texts[j] += range[i][3];
        recv[j] += range[i][4];
        appts[j] += range[i][5];
      }
    }
  }
  
  body = bodyGen(cti, emails, texts, recv, asOf, day, appts, includeIndv, MTD);
  check = body !== 'NONE';
  
  for (i = 0; i < ranger.length; i++) {
    if (ranger[i][0] !== '' && i < ranger.length - 1) {
      recipients += ranger[i][0] + ',';
    } else if (ranger[i][0] !== '' && i === ranger.length - 1) {
      recipients += ranger[i][0];
    } else {
      i = ranger.length;
    }
  }
  
  var bodyPlain = body.replace(/\<br\/\>/gi, '\n').replace(/(<([^>]+)>)/ig, '');
  
  if (check) {
    MailApp.sendEmail(recipients, subject, bodyPlain, {htmlBody: body, name: sender});
    var d = new Date();
    var timestamp = d.toLocaleTimeString();
    timestamp = timestamp.split(' MDT')[0];
    timestamp = timestamp.split(' MST')[0];
    timestamp = timestamp.split(':');
    timestamp = [timestamp[0], timestamp[1]].join(':') + timestamp[2].split(' ')[1];
    ss.toast('Email notification has been sent!', 'Success!');
    sheet.getRange(2, driver('Include'), driver('numTeams')).setValue(true);
    
    if (MTD) {
      sheet.getRange(6, driver('As of')).setValue(false);
    }
    
    if (mode !== 2) {
      sheet.getRange(driver('numTeams') + 4, driver('As of') - 1, 1, 2).setValues([[timestamp, d]]);
      if (asOf === 'End of Day' && !MTD) {
        caQuota();
      }
    }
  } else {
    ui.alert('At least ONE team MUST be included in order to send the email! Please include a team, then try again!', ui.ButtonSet.OK);
  }
}

function bodyGen(iCti, iEmails, iTexts, iRecv, asOf, day, iAppts, includeIndv, MTD) {
  //Created By Kennen Lawrence
  //Version 3.1
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ui = SpreadsheetApp.getUi();
  ss.getSheetByName('Shhhhh....').hideSheet();
  var sheet  = ss.getSheetByName('Individuals');
  var prompt = 'Type any notes you would like added below, or leave the box blank if you have none! Then press "OK" to continue! \n'
  + '------------------------------------------------------------------------------------------------------------------------------------------------------------';
  var rawNotes = ui.prompt('Notes:', prompt, ui.ButtonSet.OK);
  var notes    = rawNotes.getResponseText() + '';
  var include  = ss.getSheetByName('Main').getRange(2, driver('Include'), driver('numTeams')).getValues();
  var range    = sheet.getRange(2, 1, sheet.getLastRow() - 1, driver('Include')).getValues();
  var fontFam  = "font-family: 'Google Sans',Roboto,RobotoDraft,Helvetica,Arial,sans-serif;";
  var style    = '<html><head><style>' +
    'table {border-collapse: collapse; border: 5px solid black; color: black; ' + fontFam + '}' +
      'table th {text-align: center; border: 3px solid black; color: black; padding-left: 5px; padding-right: 5px; font-size: x-large; ' + fontFam + '}' +
        'table td {text-align: center; border: 1px solid black; color: black; padding-left: 5px; padding-right: 5px; font-size: medium; ' + fontFam + '}' +
          //          'table tr {transition: 0.1s;}' +
          //            'table tr:hover {transform: scale(1.0025);border: 2px solid black;}' +
          'h1 {color: black; font-size: medium; font-weight: 500; ' + fontFam + '}' +
            '</style></head>';
  var body = style + '<BODY><h1 style="font-size: x-large">Outbound Activity ';
  
  if (MTD) body += 'MTD ';
  
  body += 'as of - ' + asOf + ' ' + day + '</h1>';
  
  if (notes !== '') {
    body += '<h1><u>' + notes + '</u></h1><br/>';
  }
  
  var teams          = teamInfo('Teams');
  var teamIsIncluded = [];
  body += "<br/><table style='width: auto'>";
  var cti, emails, font, texts, currentReq;
  var color = 'black';
  var check = false;
  
  if (MTD) {
    var MTD_date = getMTDvalue();
  }
  
  var teamCount = []; //Array for team counts
  
  // Loop to initialize teamCount array based off of the number of teams
  for (var i = 0; i < teams.length; i++) {
    teamCount[i] = 0;
    teamIsIncluded[i] = false;
  }
  
  for (i = 0; i < include.length; i++) {
    include[i][0] = (include[i][0].toString().toUpperCase() === 'TRUE');
  }
  
  for (i = 0; i < includeIndv.length; i++) { //Loop to determine active team count
    for (var j = 0; j < teams.length; j++) {
      if (includeIndv[i][0] === teams[j] && includeIndv[i][1]) {
        teamIsIncluded[j] = true;
        
        if (includeIndv[i][2] === driver('61+')) {
          if (MTD) {
            teamCount[j] += ((driver('61+ Req') * MTD_date[0]) + (driver('31-60 Req') * MTD_date[1]));
          } else {
            teamCount[j] += driver('61+ Req');
          }
        } else if (includeIndv[i][2] === driver('31-60')) {
          if (MTD) {
            teamCount[j] += (driver('31-60 Req') * (MTD_date[0] + MTD_date[1]));
          } else {
            teamCount[j] += driver('31-60 Req');
          }
        }
      }
    }
  }
  
  for (i = 0; i < teams.length; i++) {
    if (include[i][0] && (teamCount[i] > 0 || teamIsIncluded[i])) {
      //Calculate weighted average
      var preTotal = [];
      
      if (iCti[i] / teamCount[i] > 1) {
        preTotal[0] = 1;
      } else {
        preTotal[0] = iCti[i] / teamCount[i];
      }
      if (iEmails[i] / teamCount[i] > 1) {
        preTotal[1] = 1;
      } else {
        preTotal[1] = iEmails[i] / teamCount[i];
      }
      if (iTexts[i] / teamCount[i] > 1) {
        preTotal[2] = 1;
      } else {
        preTotal[2] = iTexts[i] / teamCount[i];
      }
      
      var total;
      
      if (preTotal[0] === 1 && preTotal[1] === 1 && preTotal[2] === 1) {
        total = 100;
      } else if (preTotal[0] + preTotal[1] + preTotal[2] >= 2.98) {
        total = 99.49;
      } else {
        total = (((preTotal[0]) * (1 / 3)) + ((preTotal[1]) * (1 / 3)) + ((preTotal[2]) * (1 / 3))) * 100;
      }
      
      if (total < 100) {
        if (total > 50) {
          font = "#EEEE16";
          color = "black";
        } else {
          font = "#FB3333";
          color = "black";
        }
      } else {
        font = "#11E31B";
        color = "black";
      }
      
      //Logger.log(teams[i]+": "+(preTotal[0]+preTotal[1]+preTotal[2]));
      body += "<tr><th style='color: " + color + "; background-color: " + font + ";' colspan = '6'><b><u>" + teams[i] + ": ";
      
      if (!isNaN(total)) {
        body += Math.round(total) + "% of Total Outbound Completed";
      } //Should append % complete?
      
      body += "</u></b></th></tr><tr style='border: 2px solid black;'><td style='background-color: white; font-size: large;'><b>CA:</b></td>";
      
      if (iCti[i] / teamCount[i] < 1) {
        if (iCti[i] / teamCount[i] > 0.7) {
          font = "#EEEE16";
          color = "black";
        } else {
          font = "#FB3333";
          color = "black";
        }
      } else {
        font = "#11E31B";
        color = "black";
      }
      
      body += "<td style='background-color: " + font + "; font-size: large; color: " + color + ";'><b>CTI: " + iCti[i];
      
      if (teamCount[i] !== 0) {
        body += "/" + teamCount[i];
      }
      
      if (iEmails[i] / teamCount[i] < 1) {
        if (iEmails[i] / teamCount[i] > 0.7) {
          font = "#EEEE16";
          color = "black";
        } else {
          font = "#FB3333";
          color = "black";
        }
      } else {
        font = "#11E31B";
        color = "black";
      }
      
      body += "</b></td><td style='background-color: " + font + "; font-size: large; color: " + color + ";'><b>Email Out: " + iEmails[i];
      
      if (teamCount[i] !== 0) {
        body += "/" + teamCount[i];
      }
      
      if (iTexts[i] / teamCount[i] < 1) {
        if (iTexts[i] / teamCount[i] > 0.7) {
          font = "#EEEE16";
          color = "black";
        } else {
          font = "#FB3333";
          color = "black";
        }
      } else {
        font = "#11E31B";
        color = "black";
      }
      
      body += "</b></td><td style='background-color: " + font + "; font-size: large; color: " + color + ";'><b>Texts: " + iTexts[i];
      
      if (teamCount[i] !== 0) body += "/" + teamCount[i];
      
      body += "</b></td><td style='background-color: white; font-size: large;'><b>Email In: " + iRecv[i] + "</b></td>";
      body += "<td style='background-color: white; font-size: large;'><b>Set Appt: " + iAppts[i] + "</b></td></tr>";
      
      for (j = 0; j < range.length; j++) {
        if (range[j][driver('mainColumns')] === teams[i] && includeIndv[j][1]) {
          if (includeIndv[j][2] === driver('31-60')) {
            if (MTD) {
              currentReq = (driver('31-60 Req') * (MTD_date[0] + MTD_date[1]));
            } else {
              currentReq = driver('31-60 Req');
            }
          } else if (includeIndv[j][2] === driver('61+')) {
            if (MTD) {
              currentReq = (driver('61+ Req') * MTD_date[0]) + (driver('31-60 Req') * MTD_date[1]);
            } else {
              currentReq = driver('61+ Req');
            }
          }
          
          if (includeIndv[j][2] !== driver("<31")) {
            body += "<tr><td style='background-color: white;'>" + range[j][0] + "</td>";
            
            if (range[j][2] < currentReq) {
              if (range[j][2] > 0.7 * currentReq) {
                font = "#EEEE16";
                color = "black";
              } else {
                font = "#FB3333";
                color = "black";
              }
            } else {
              font = "#11E31B";
              color = "black";
            }
            
            body += "<td style='background-color: " + font + "; color: " + color + ";'>" + range[j][2] + "/" + currentReq + "</td>";
            
            if (range[j][1] < currentReq) {
              if (range[j][1] > 0.7 * currentReq) {
                font = "#EEEE16";
                color = "black";
              } else {
                font = "#FB3333";
                color = "black";
              }
            } else {
              font = "#11E31B";
              color = "black";
            }
            
            body += "<td style='background-color: " + font + "; color: " + color + ";'>" + range[j][1] + "/" + currentReq + "</td>";
            
            if (range[j][3] < currentReq) {
              if (range[j][3] > 0.7 * currentReq) {
                font = "#EEEE16";
                color = "black";
              } else {
                font = "#FB3333";
                color = "black";
              }
            } else {
              font = "#11E31B";
              color = "black";
            }
            
            body += "<td style='background-color: " + font + "; color: " + color + ";'>" + range[j][3] + "/" + currentReq + "</td>";
            body += "<td style='background-color: white;'>" + range[j][4] + "</td>";
            body += "<td style='background-color: white;'>" + range[j][5] + "</td></tr>";
          } else {
            body += "<tr><td style='background-color: white;'>" + range[j][0] + "</td>";
            body += "<td style='background-color: white;'>" + range[j][2] + "</td>";
            body += "<td style='background-color: white;'>" + range[j][1] + "</td>";
            body += "<td style='background-color: white;'>" + range[j][3] + "</td>";
            body += "<td style='background-color: white;'>" + range[j][4] + "</td>";
            body += "<td style='background-color: white;'>" + range[j][5] + "</td></tr>";
          }
        }
      }
      check = true;
    }
    //else { Logger.log("Skip"); }
  }
  
  if (check) {
    return body + "</table>";
  } else {
    return 'NONE';
  }
}

function quotaCheck() {
  var emailQuotaRemaining = MailApp.getRemainingDailyQuota();
  Logger.log("Remaining email quota: " + emailQuotaRemaining);
}

function getName() {
  //Created By Kennen Lawrence
  //Version 1.0
  var email  = Session.getActiveUser().getEmail();
  var emails = driver('emails');
  var name, first, last;
  
  for (var i = 0; i < emails.length; i++) {
    if (emails[i][0].toLowerCase() === email.toLowerCase()) {
      first = emails[i][1];
      last  = emails[i][2];
    }
  }
  
  if (first === undefined) {
    name  = email.split('@schomp.com');
    name  = name[0];
    name  = name.split('.');
    first = name[0];
    last  = name[1];
  }
  
  first = first[0].toUpperCase() + first.substring(1);
  last  = last[0].toUpperCase() + last.substring(1);
  name  = first + ' ' + last;
  
  return name;
}

function caQuota() {
  var ss      = SpreadsheetApp.getActiveSpreadsheet();
  var sheet   = ss.getSheetByName('Individuals');
  var range   = sheet.getRange(2, 1, sheet.getLastRow() - 1);
  var values  = range.getValues();
  var include = sheet.getRange(2, driver('Include') + 1, sheet.getLastRow() - 1).getValues();
  var target  = ss.getSheetByName('Requirements');
  
  if (target) ss.deleteSheet(target);
  
  ss.getSheetByName('Requirements Master').copyTo(ss).setName('Requirements');
  target = ss.getSheetByName('Requirements');
  toggleReqFormulas(true, target);
  SpreadsheetApp.flush();
  target.getRange(2, 1, values.length).setValues(values);
  
  var req = target.getRange(2, 2, target.getLastRow() - 1, 4).getDisplayValues();
  var count;
  
  for (var i = 0; i < values.length; i++) {
    count = 0;
    
    for (var j = 0; j < req[i].length; j++) {
      if (req[i][j] !== '') {
        count += parseInt(req[i][j]);
      }
    }
    
    if (count > 0 && include[i][0]) {
      req[i][3] = 'No';
    } else if (include[i][0] === 'No') {
      req[i][3] = 'OFF';
    } else {
      req[i][3] = '';
    }
  }
  
  target.getRange(2, 2, target.getLastRow() - 1, 4).setValues(req);
  target.showSheet();
  sheet.getRange(2, driver('Include') + 1, values.length).setValue(true);
  ss.setActiveSheet(target);
  ss.moveActiveSheet(3);
  sheet = ss.getSheetByName('Main');
  ss.setActiveSheet(sheet);
  sheet.getRange(2, driver('Include'), driver('numTeams')).setValue(true);
}

function toggleReqFormulas(activate, sheet) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  sheet = sheet || ss.getSheetByName('Requirements');
  var range = sheet.getRange(2, 2, sheet.getMaxRows() - 1, 3);
  var formulas = range.getFormulas();
  var strings = range.getValues();
  var hasAllFormulas = !formulas.filter(function (formulaRow) {
    return formulaRow.filter(function (formula) {
      return !formula;
    }).length !== 0;
  })[0];
  var hasNoFormulas = !formulas.filter(function (formulaRow) {
    return formulaRow.filter(function (formula) {
      return formula;
    }).length !== 0;
  })[0];
  
  formulas = formulas.map(function (formulaRow, row) {
    return formulaRow.map(function (formula, col) {
      return !formula ? strings[row][col] : formula;
    });
  });
  
  if ((hasAllFormulas && activate) || (hasNoFormulas && activate === false)) return;
  
  if (activate || (!hasAllFormulas && activate !== false)) {
    return range.setValues(
      formulas.map(function (formulaRow) {
        return formulaRow.map(function (formula) {
          return (formula[0] !== '=' ? '=' : '') + formula;
        });
      })
    );
  }
  
  range.setValues(
    formulas.map(function (formulaRow) {
      return formulaRow.map(function (formula) {
        return formula[0] === '=' ? formula.substr(1) : formula;
      });
    })
  );
}

function getMTDvalue() {
  var numDaysOff = 0;
  var numSat     = 0;
  var info       = new Date();
  var date       = info.getDate();
  var day        = info.getDay();
  Logger.log(date);
  
  for (var i = date; i > 0; i--) {
    if (day === 0 || day === 1) {
      numDaysOff++;
    } else if (day === 6) {
      numSat++;
    }
    
    if (day === 0) {
      day = 6;
    } else {
      day--;
    }
  }
  
  return [(date - numDaysOff - numSat), numSat];
}