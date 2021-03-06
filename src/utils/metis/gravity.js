import {applicationAccountProperties} from "../../properties/applicationAccountProperties";

const ApiConfig = require("../../api.config.ts").ApiConfig;
const axios = require('axios');
const crypto = require('crypto');
const events = require('events');
const _ = require('lodash');
const methods = require('./_methods');
const {JupiterAPIService} = require('../../services/jupiterAPIService');
import {logger} from '../../services/logger.service'
// import JupiterAPIService from "../../services/jupiterAPIService";


// const logger = require('./logger');

const addressBreakdown = process.env.APP_ACCOUNT_ADDRESS ? process.env.APP_ACCOUNT_ADDRESS.split('-') : [];

class Gravity {
  constructor() {
    this.algorithm = process.env.ENCRYPT_ALGORITHM;
    this.appPassword = process.env.ENCRYPT_PASSWORD;
    this.sender = process.env.APP_PASSPHRASE;
    this.version = process.env.VERSION;
    this.jupiter_data = {
      server: process.env.JUPITER_SERVER,
      feeNQT: process.env.MINIMUM_FEE,
      deadline: process.env.DEADLINE,
      minimumTableBalance: process.env.MIN_TABLE_BALANCE,
      minimumAppBalance: process.env.MIN_APP_BALANCE,
      moneyDecimals: process.env.MONEY_DECIMALS,
      version: process.env.VERSION,
    };

    this.generate_passphrase = methods.generate_passphrase;
    this.appSchema = {
      appData: {
        name: '',
        address: '',
        description: '',
      },
      tables: [],
    };
    this.fundingProperty = `funding-${addressBreakdown[addressBreakdown.length - 1]}`;
    this.data = {};
    this.tables = [];
  }

  hasTable(database, tableName) {
    let hasKey = false;
    for (let x = 0; x < database.length; x += 1) {
      const tableKeys = Object.keys(database[x]);
      if (tableKeys.includes(tableName)) {
        hasKey = true;
        break;
      }
    }

    return hasKey;
  }

  tableBreakdown(database) {
    const tableList = [];

    for (let x = 0; x < database.length; x += 1) {
      const tableKeys = Object.keys(database[x]);
      if (tableKeys.length > 0) {
        tableList.push(tableKeys[0]);
      }
    }

    return tableList;
  }

  getTableData(table, database) {
    let tableData;

    for (let x = 0; x < database.length; x += 1) {
      const tableKeys = Object.keys(database[x]);
      if (tableKeys.length > 0) {
        if (tableKeys[0] === table && !tableData) {
          tableData = database[x];
          break;
        }
      }
    }

    return tableData[table];
  }

  showTables(returnType = 'app') {
    const self = this;
    return new Promise((resolve, reject) => {
      self.loadAppData()
        .then((response) => {
          if (returnType === 'console') {
            logger.info(
              `Database tables associated with your app ${
                response.app.appData.name
              } (${response.app.address})`,
            );
            logger.info(response.tables);
            logger.info('If you wish to show table details, run "npm run gravity:db"');
            logger.info('If you wish to add a new table, run "npm run gravity:db:add"');
          }
          resolve(response.tables);
        })
        .catch((error) => {
          logger.error(error);
          reject(error);
        });
    });
  }


  loadTables(returnType = 'app', accessData) {
    const self = this;
    let current;
    return new Promise((resolve, reject) => {
      self.loadAppData(accessData)
        .then((response) => {
          const { tables } = response.app;

          if (returnType === 'console') {
            logger.silly(`Database tables associated with your app ${response.app.appData.name}(${response.app.address})`);
            Object.keys(tables).forEach((x) => {
              current = tables[x];
              const [key] = Object.keys(tables[x]);
              logger.silly(`Table => ${key}`);
              logger.silly('---Table Address---');
              logger.silly(current[key].address);
              logger.silly('---Table Passphrase---');
              // logger.sensitiveInfo(current[key].passphrase);
              logger.silly('---Table Public Key---');
              logger.silly(current[key].public_key);
              logger.silly('----------------------------------------------------------------');
            });
          }
          resolve(tables);
        })
        .catch((error) => {
          logger.error(error);
          reject(error);
        });
    });
  }

  encrypt(text, password = this.appPassword) {
    const cipher = crypto.createCipher(this.algorithm, password);
    let crypted = cipher.update(text, 'utf8', 'hex');
    crypted += cipher.final('hex');

    return crypted;
  }

  decrypt(text, password = this.appPassword) {
    try {
      // logger.sensitiveInfo(` Decrypting with password: ${password}  algorithm: ${this.algorithm}`);
      // logger.sensitiveInfo(text);

      const decipher = crypto.createDecipher(this.algorithm, password);
      let dec = decipher.update(text, 'hex', 'utf8');
      dec += decipher.final('utf8');
      logger.debug(`decrypted...`)
      return dec;
    } catch( error){
      logger.warn(`NOT able to decrypt`);
      logger.warn(error);
      throw error
    }
  }

  sortByDate(array, order = 'asc') {
    return array.sort((a, b) => {
      const x = a.date;
      const y = b.date;
      let ruleOne;
      let ruleTwo;

      if (order === 'asc' || order !== 'desc') {
        ruleOne = (x !== undefined && x > y);
        ruleTwo = (x === undefined || x < y);
      } else {
        ruleOne = (x < y);
        ruleTwo = (x > y);
      }
      const result = ruleOne ? -1 : (ruleTwo ? 1 : 0);

      return (result);
    });
  }

  isSubtable(MainTable, SubTable) {
    const mainTable = MainTable.sort().join(',');
    const subtable = SubTable.sort().join(',');
    let returnValue;
    if (mainTable.includes(subtable)) {
      returnValue = true;
    } else {
      returnValue = false;
    }
    return returnValue;
  }

  sortBySubkey(array, key, subkey) {
    return array.sort((a, b) => {
      const x = a[key][subkey];
      const y = b[key][subkey];
      const result = (x !== undefined && x > y) ? -1 : ((x === undefined || x < y) ? 1 : 0);

      return (result);
    });
  }


  validateTransaction(transaction, filter) {
    if (!filter || typeof filter !== 'object') {
      return true;
    }

    if (filter.signature && transaction.signature !== filter.signature) {
      return false;
    }

    if (filter.signatureHash && transaction.signatureHash !== filter.signatureHash) {
      return false;
    }

    if (filter.type && transaction.type !== filter.type) {
      return false;
    }

    if (filter.hasAttachment && !transaction.attachment) {
      return false;
    }

    if (filter.senderRS && transaction.senderRS !== filter.senderRS) {
      return false;
    }

    if (filter.recipientRS && transaction.recipientRS !== filter.recipientRS) {
      return false;
    }

    if (filter.sender && transaction.sender !== filter.sender) {
      return false;
    }

    if (filter.recipient && transaction.recipient !== filter.recipient) {
      return false;
    }

    if (filter.block && transaction.block !== filter.block) {
      return false;
    }

    if (filter.blockTimestamp && transaction.blockTimestamp !== filter.blockTimestamp) {
      return false;
    }

    if (filter.timestamp && transaction.timestamp !== filter.timestamp) {
      return false;
    }

    if (filter.timestampHigherThan && transaction.timestamp < filter.timestampHigherThan) {
      return false;
    }

    if (filter.timestampLowerThan && transaction.timestamp > filter.timestampLowerThan) {
      return false;
    }

    if (filter.heightHigherThan && transaction.height < filter.heightHigherThan) {
      return false;
    }

    if (filter.heightLowerThan && transaction.height > filter.heightLowerThan) {
      return false;
    }

    if (filter.confirmationsHigherThan
      && transaction.confirmations < filter.confirmationsHigherThan) {
      return false;
    }

    if (filter.confirmationsLowerThan
      && transaction.confirmations > filter.confirmationsLowerThan) {
      return false;
    }

    if (filter.transaction && transaction.transaction !== filter.transaction) {
      return false;
    }

    return true;
  }

  async decryptMessage(transactionId, passphrase) {
    let response;
    try {
      const apiCall = `${this.jupiter_data.server}/nxt?requestType=readMessage&transaction=${transactionId}&secretPhrase=${passphrase}`;
      const call = await axios.get(apiCall);
      response = call.data;
    } catch (e) {
      response = { error: true, fullError: e };
    }

    return response;
  }

  loadAppData(containedDatabase) {
    logger.silly('###########################')
    logger.silly(`## gravity.loadAppData(containedDatabase=${!!containedDatabase})`)
    containedDatabase = containedDatabase || false;

    if(containedDatabase){
      logger.silly(` account: ${containedDatabase.account}`);
      logger.silly(` passphrase: ****`);
      logger.silly(` password: ****`);
      logger.silly(` iat: ${containedDatabase.iat}`);
      logger.silly(` accountId: ${containedDatabase.accountId}`);
      logger.silly(` publicKey: ${containedDatabase.publicKey}`);
      logger.silly(` encryptionPassword: ***`);
    }

    const eventEmitter = new events.EventEmitter();

    const self = this;
    const appname = process.env.APPNAME;
    let server = process.env.JUPITER_SERVER;
    let passphrase = process.env.APP_PASSPHRASE;
    let account = process.env.APP_ACCOUNT_ADDRESS;

    let records = [];
    let numberOfRecords;
    let { appPassword } = self;
    let userRecord;
    let hasUserTable = false;

    if (containedDatabase) {
      server = process.env.JUPITER_SERVER;
      ({ account } = containedDatabase);
      ({ passphrase } = containedDatabase);
      appPassword = containedDatabase.encryptionPassword;
    }

    return new Promise((resolve, reject) => {
      let responseMessage;

      eventEmitter.on('loaded_records', () => {
        logger.debug(`loadAppData().loaded_records`);
        logger.debug(`records count: ${records.length}`);

        if (records !== undefined && records.length > 0) {
          const tableList = [];
          const tablesRetrieved = {};

          for (let x = 0; x < Object.keys(records).length; x += 1) {
            if (containedDatabase) {
              // console.log('These are the records given in load app data through user');
              // console.log(records[x]);
              if (records[x] && records[x].user_record && !userRecord) {
                userRecord = records[x].user_record;
              }

              if (records[x].users) {
                hasUserTable = true;
              }
            }
            if (records[x].tables && records[x].date && records[x].date) {
              tableList.push(records[x]);
            } else {
              const objectKey = Object.keys(records[x])[0];
              if (tablesRetrieved[objectKey] === undefined) {
                tablesRetrieved[objectKey] = [];
                tablesRetrieved[objectKey].push(records[x]);
              } else {
                tablesRetrieved[objectKey].push(records[x]);
              }
            }
          }

          logger.debug(`all table records`);
          logger.debug( Object.keys(tablesRetrieved));

          logger.silly('--- TableList ---')

          // Once we have separated the records into table list and potentially table object list,
          // we then retrieve the last table record
          // self.sortByDate(tableList);
          // const tablesRetrievedAndSorted = _.sortBy(tablesRetrieved[thisKey], [`${thisKey}.date`, `${thisKey}.address`]);


          const  latestTablesRecord = tableList.reduce( (reducer, table) => {
              if(!reducer){
                return table;
              }
              if( reducer.date > table.date){
                return reducer
              } else {
                return table
              }
          })

          logger.silly(`latestTablesRecord= ${ JSON.stringify(latestTablesRecord)}`);

          const latestListOfTableNames = latestTablesRecord.tables

          logger.silly(`latestListOfTableNames= ${ JSON.stringify(latestTablesRecord.tables)}`);

          // const tablesRetrievedAndSorted = _.sortBy(tablesRetrieved[thisKey], [`${thisKey}.date`, `${thisKey}.address`]);


          // This variable will represent the most recent and valid list of tables in the app
          // let currentList = [];

          // for (let y = 0; y < Object.keys(tableList).length; y += 1) {
          //   if (tableList[y].tables.length > currentList.length) {
          //     if (currentList.length === 0) {
          //       currentList = tableList[y].tables;
          //     } else if (self.isSubtable(currentList, tableList[y].tables)) {
          //       currentList = tableList[y].tables;
          //     }
          //   }
          // }

          logger.silly(`Current Table List: ${latestListOfTableNames}`);

          // Now that we have a list with all the table records and the list of tables
          // that the app should be using. We go through the tablesRetrieved and get the
          // latest records of each table that the app is supposed to be using.
          const tableData = [];

          const currentList = latestListOfTableNames
          for (let i = 0; i < Object.keys(currentList).length; i += 1) {
            const thisKey = currentList[i];
            if (tablesRetrieved[thisKey]) {
              // We need to sort the the list we are about to call
              const tablesRetrievedAndSorted = _.sortBy(tablesRetrieved[thisKey], [`${thisKey}.date`, `${thisKey}.address`]);

              // Once we do this, we can obtain the last record and push to the tableData variable
              // NOTE: We'll expand validation of tables in future releases
              tableData.push(tablesRetrievedAndSorted[0]);
            }
          }

          // logger.sensitiveInfo(tableData);
          self.appSchema.tables = tableData;
          self.appSchema.appData.name = appname;
          self.appSchema.address = account;
          responseMessage = {
            numberOfRecords,
            success: true,
            app: self.appSchema,
            message: 'Existing record found',
            tables: currentList,
            hasUserTable,
            userRecord,
          };

          logger.silly('loadAppData() completed.')
          return resolve(responseMessage);
        } else {
          responseMessage = {
            numberOfRecords,
            success: true,
            app:
            self.appSchema,
            hasUserTable,
            userRecord,
            message: 'No app record',
          };

          logger.silly('loadAppData() completed')
          return resolve(responseMessage);
        }
      });

      self.getRecords(account, account, passphrase, { size: 'all', show_pending: null, show_unconfirmed: false }, appPassword)
        .then((response) => {
          logger.silly(`self.getRecords().then()`);
          // logger.sensitiveInfo(response)
          // ({ records } = response);
          records = response.records;
          logger.debug(`--- records ---`)
          // logger.sensitiveInfo(records);
          // console.log(records);

          if (containedDatabase) {
            // console.log('These are the records given in load app data through user');
            // console.log(records);
          }
          numberOfRecords = response.recordsFound;
          logger.silly(`numberOfRecords: ${response.recordsFound}`);
          eventEmitter.emit('loaded_records');
        })
        .catch((error) => {
          logger.silly('Theres an error!');
          logger.silly(error);
          reject({ success: false, error: 'There was an error loading records' });
        });
    });
  }

  getMessages(address, passphrase) {
    const eventEmitter = new events.EventEmitter();
    const self = this;

    return new Promise((resolve, reject) => {
      const records = [];
      const decryptedRecords = [];
      const decryptedPendings = [];
      // const pendingRecords = [];
      let recordsFound = 0;
      let responseData;
      let database = [];
      let completedNumber = 0;
      // let pendingNumber = 0;
      // let show_pending = scope.show_pending;

      eventEmitter.on('set_responseData', () => {
        responseData = {
          recordsFound,
          pending: decryptedPendings,
          records: decryptedRecords,
          last_record: decryptedRecords[0],
        };

        resolve(responseData);
      });

      eventEmitter.on('check_on_pending', async () => {
        eventEmitter.emit('set_responseData');
      });

      eventEmitter.on('records_retrieved', () => {
        if (records.length <= 0) {
          eventEmitter.emit('check_on_pending');
        } else {
          let recordCounter = 0;
          Object.keys(records).forEach((p) => {
            const transactionId = records[p];
            const thisUrl = `${self.jupiter_data.server}/nxt?requestType=readMessage&transaction=${transactionId}&secretPhrase=${passphrase}`;
            axios.get(thisUrl)
              .then((response) => {
                try {
                  // This decrypts the message from the blockchain using native encryption
                  const decryptedMessage = this.decrypt(response.data.decryptedMessage);
                  const parsedMessage = JSON.parse(decryptedMessage);

                  decryptedRecords.push(parsedMessage);
                } catch (e) {
                  logger.error(e);
                  // Error here tend to be trying to decrypt a regular message from Jupiter
                  // rather than a gravity encrypted message
                }
                recordCounter += 1;
                if (recordCounter === completedNumber) {
                  eventEmitter.emit('check_on_pending');
                }
              })
              .catch((error) => {
                logger.error(error);
                reject(error);
              });
          });
        }
      });

      eventEmitter.on('database_retrieved', () => {
        for (let obj = 0; obj < Object.keys(database).length; obj += 1) {
          if (database[obj].attachment.encryptedMessage
            && database[obj].attachment.encryptedMessage.data != null
            && database[obj].recipientRS === address) {
            records.push(database[obj].transaction);
            completedNumber += 1;
            recordsFound += 1;
          }
        }
        eventEmitter.emit('records_retrieved');
      });

      axios.get(`${self.jupiter_data.server}/nxt?requestType=getBlockchainTransactions&account=${address}&withMessage=true&type=1`)
        .then((response) => {
          database = response.data.transactions;
          eventEmitter.emit('database_retrieved');
        })
        .catch((error) => {
          logger.error(error);
          resolve({ success: false, errors: error });
        });
    });
  }

  getRecords(userAddress, recordsAddress, recordPassphrase, scope = {
    size: 'all',
    show_pending: null,
    show_unconfirmed: false,
    recipientOnly: false,
  }, appPassword = this.appPassword

  ) {
    logger.silly(`##########################################`);
    logger.silly(`## getRecord(userAddress=${userAddress}, recordsAddress=${recordsAddress}, recordPassphrase, scope= ${!!scope})`);

    const eventEmitter = new events.EventEmitter();
    const self = this;

    return new Promise((resolve, reject) => {
      const records = [];
      const decryptedRecords = [];
      const decryptedPendings = [];
      const pendingRecords = [];
      let recordsFound = 0;
      let responseData = {};
      let transacions = [];
      let completedNumber = 0;
      let pendingNumber = 0;
      // let show_pending = scope.show_pending;

      eventEmitter.on('set_responseData', () => {
        // console.log('DECRYPTED RECORDS**************************', decryptedRecords);
        logger.silly(`setRecords().set_responseData()`);
        if (scope.size !== 'last') {
          if (scope.show_pending !== undefined && scope.show_pending > 0) {
            responseData = {
              recordsFound,
              pending: decryptedPendings,
              records: decryptedRecords,
              last_record: decryptedRecords[0],
            };
          } else {
            responseData = {
              recordsFound,
              records: decryptedRecords,
              last_record: decryptedRecords[0],
            };
          }
        } else if (scope.size === 'last') {
          responseData = { records: decryptedRecords[0] };
        } else {
          responseData = { records: null, error: 'Invalid scope size' };
        }

        logger.debug('getRecords().return()')
        // logger.sensitiveInfo(JSON.stringify(responseData));
        return resolve(responseData);
      });

      eventEmitter.on('check_on_pending', async () => {
        logger.debug(`setRecords().check_on_pending()`);
        if (scope.show_unconfirmed) {
          const filter = {};
          if (!scope.shared_table) {
            filter.account = recordsAddress;
          }

          try {
            const unconfirmedObjects = await self.getUnconfirmedData(
              userAddress,
              recordPassphrase,
              filter,
              scope.accessData,
            );

            logger.silly(`unconfirmed Data Count: ${unconfirmedObjects.length}`);

            for (let x = 0; x < unconfirmedObjects.length; x += 1) {
              const thisUnconfirmedRecord = unconfirmedObjects[x];

              if (thisUnconfirmedRecord.data) {
                decryptedRecords.push(thisUnconfirmedRecord.data);
              }
            }
            eventEmitter.emit('set_responseData');
          } catch (e) {
            logger.error(e);
            eventEmitter.emit('set_responseData');
          }
        } else if (Object.keys(pendingRecords).length > 0) {
          let recordCounter = 0;

          logger.silly(`pendingRecords count: ${pendingRecords.length}`);

          pendingRecords.forEach((p) => {
            const thisUrl = `${self.jupiter_data.server}/nxt?requestType=readMessage&transaction=${p}&secretPhrase=${recordPassphrase}`;

            axios.get(thisUrl)
              .then((response) => {
                try {
                  //@TOD this needs to get fixed!  readMessage can also return data.message or both
                  const decriptedPending = JSON.parse(response.data.decryptedMessage);
                  decryptedPendings.push(decriptedPending);
                  logger.debug(`decryptedPendings count: ${decriptedPending.length}`);
                } catch (e) {
                  logger.error(JSON.stringify(e));
                }

                recordCounter += 1;

                if (recordCounter === pendingNumber) {
                  eventEmitter.emit('set_responseData');
                }
              })
              .catch((error) => {
                logger.error('ERROR!!!')
                logger.error(error);
                return reject({ success: false, errors: error });
              });
          });
        } else {
          eventEmitter.emit('set_responseData');
        }
      });

      eventEmitter.on('records_retrieved', () => {
        logger.silly(`###############################`)
        logger.silly(`records_retrieved()`);
        logger.silly(`###############################`)
        if (records.length <= 0) {
          eventEmitter.emit('check_on_pending');
        } else {
          let recordCounter = 0;
          Object.keys(records).forEach((key) => {
            const transactionId = records[key];
            const thisUrl = `${self.jupiter_data.server}/nxt?requestType=readMessage&transaction=${transactionId}&secretPhrase=${recordPassphrase}`;
            console.log('url=', `${self.jupiter_data.server}/nxt?requestType=readMessage&transaction=${transactionId}&secretPhrase=*****` );
            axios.get(thisUrl)
              .then((response) => {
                try {
                  let recordPassword;
                  if (scope.accessData){
                    logger.silly(`using accessData passsword`)
                    recordPassword = scope.accessData.encryptionPassword;
                  } else {
                    logger.silly(`using app password`);
                    recordPassword = appPassword;
                  }

                  const { decryptedMessage } = response.data;
                  console.log('DECRYPTING...........');
                  const decrypted = JSON.parse(self.decrypt(decryptedMessage, recordPassword));
                  decrypted.confirmed = true;
                  decryptedRecords.push(decrypted);
                } catch (error) {
                  logger.silly(`there was a problem with decrypting the record transactions`);
                  console.log(error);
                }

                recordCounter += 1;
                if (recordCounter === completedNumber) {
                  eventEmitter.emit('check_on_pending');
                }
              })
          });
        }
      });

      eventEmitter.on('database_retrieved', () => {
        for (let index = 0; index < Object.keys(transacions).length; index += 1) {
          let completion = false;
          if (transacions[index].attachment.encryptedMessage
            && transacions[index].attachment.encryptedMessage.data != null
            && transacions[index].senderRS === recordsAddress) {
            if (scope.show_pending !== undefined && scope.show_pending > 0) {
              if (transacions[index].confirmations <= scope.show_pending) {
                pendingRecords.push(index.transaction);
                pendingNumber += 1;
              } else {
                records.push(transacions[index].transaction);
                completedNumber += 1;
              }
            } else if (scope.size === 'all') {
              records.push(transacions[index].transaction);
              completedNumber += 1;
            } else if (scope.size === 'last') {
              records.push(transacions[index].transaction);
              recordsFound += 1;
              completedNumber += 1;
              completion = true;
            }
            recordsFound += 1;
          }
          if (completion) {
            break;
          }
        }
        logger.silly(` Number of transactions to process: ${records.length}`);
        eventEmitter.emit('records_retrieved');
      });

      const port = process.env.JUPITER_PORT ? `:${process.env.JUPITER_PORT}` : '';
      const url = `${self.jupiter_data.server}${port}/nxt?requestType=getBlockchainTransactions&account=${userAddress}&withMessage=true&type=1`;
      logger.silly(url);
      axios.get(url)
        .then((response) => {
          logger.silly('Getting blockchain transactions: Response');
          transacions = response.data.transactions;
          console.log('----------------------- - ------------------------------')
          logger.silly(`transactions count: ${transacions.length}`);
          eventEmitter.emit('database_retrieved');
        })
        .catch((error) => {
          logger.error(error);
          return resolve({ success: false, errors: error });
        });
    });
  }

  getAppRecords(appAddress, appPassphrase) {
    logger.silly(`getAppRecords()`)
    const eventEmitter = new events.EventEmitter();
    const self = this;

    return new Promise((resolve, reject) => {
      const records = [];
      const decryptedRecords = [];
      let recordsFound = 0;
      let responseData;
      let database = [];
      let completedNumber = 0;

      eventEmitter.on('set_responseData', () => {
        responseData = {
          recordsFound,
          records: decryptedRecords,
          last_record: decryptedRecords[0],
        };

        resolve(responseData);
      });

      eventEmitter.on('records_retrieved', () => {
        if (records.length <= 0) {
          eventEmitter.emit('set_responseData');
        } else {
          let recordCounter = 0;
          records.forEach((p) => {
            const thisUrl = `${self.jupiter_data.server}/nxt?requestType=readMessage&transaction=${p}&secretPhrase=${appPassphrase}`;
            axios.get(thisUrl)
              .then((response) => {
                try {
                  //  This decrypts the message from the blockchain using native encryption
                  // as well as the encryption based on encryption variable
                  const decrypted = JSON.parse(self.decrypt(response.data.decryptedMessage));
                  decryptedRecords.push(decrypted);
                  // console.log(decryptedRecords);
                } catch (e) {
                  logger.error(e);
                }
                recordCounter += 1;

                if (recordCounter === completedNumber) {
                  eventEmitter.emit('set_responseData');
                }
              })
              .catch((error) => {
                logger.error(error);
                reject({ success: false, error: error.response });
              });
          });
        }
      });

      eventEmitter.on('database_retrieved', () => {
        for (let obj = 0; obj < Object.keys(database).length; obj += 1) {
          if (database[obj].attachment && database[obj].attachment.encryptedMessages) {
            records.push(database[obj].transaction);
            completedNumber += 1;
            recordsFound += 1;
          }
        }
        eventEmitter.emit('records_retrieved');
      });

      axios.get(`${self.jupiter_data.server}/nxt?requestType=getBlockchainTransactions&account=${appAddress}&withMessage=true&type=1`)
        .then((response) => {
          database = response.data.transactions;
          eventEmitter.emit('database_retrieved');
        })
        .catch((error) => {
          logger.error(error);
          resolve({ success: false, errors: error });
        });
    });
  }


  getAllRecords(table, scope = { size: 'all', show_pending: null }) {
    logger.silly(`getAllRecords()`);
    const eventEmitter = new events.EventEmitter();
    const self = this;

    return new Promise((resolve, reject) => {
      const records = [];
      const recordsDetails = {};
      const decryptedRecords = [];
      const decryptedPendings = [];
      const pendingRecords = [];
      let recordsFound = 0;
      let responseData;
      let database;
      let recordTable;
      let tableData;
      // let { show_pending } = scope;
      let completedNumber = 0;
      let pendingNumber = 0;

      eventEmitter.on('set_responseData', () => {
        if (scope.size !== 'last') {
          if (scope.show_pending !== undefined && scope.show_pending > 0) {
            responseData = {
              recordsFound,
              pending: decryptedPendings,
              records: decryptedRecords,
              last_record: decryptedRecords[0],
            };
          } else {
            responseData = {
              recordsFound,
              records: decryptedRecords,
              last_record: decryptedRecords[0],
            };
          }
        } else if (scope.size === 'last') {
          responseData = { record: decryptedRecords[0] };
        } else {
          responseData = { records: null, error: 'Invalid scope size' };
        }
        resolve(responseData);
      });

      eventEmitter.on('check_on_pending', () => {
        if (Object.keys(pendingRecords).length > 0) {
          let recordCounter = 0;

          pendingRecords.forEach((p) => {
            const thisUrl = `${self.jupiter_data.server}/nxt?requestType=readMessage&transaction=${p}&secretPhrase=${recordTable.passphrase}`;
            axios.get(thisUrl)
              .then((response) => {
                try {
                  const decriptedPending = JSON.parse(response.data.decryptedMessage);
                  decriptedPending.confirmed = true;
                  decryptedPendings.push(decriptedPending);
                } catch (e) {
                  logger.error(e);
                }
                recordCounter += 1;

                if (recordCounter === pendingNumber) {
                  eventEmitter.emit('set_responseData');
                }
              })
              .catch((error) => {
                reject(error);
              });
          });
        } else {
          eventEmitter.emit('set_responseData');
        }
      });

      eventEmitter.on('records_retrieved', () => {
        if (Object.keys(records).length <= 0) {
          eventEmitter.emit('check_on_pending');
        } else {
          let recordCounter = 0;
          records.forEach((p) => {
            const thisUrl = `${self.jupiter_data.server}/nxt?requestType=readMessage&transaction=${p}&secretPhrase=${recordTable.passphrase}`;
            axios.get(thisUrl)
              .then((response) => {
                try {
                  // This decrypts the message from the blockchain using native encryption
                  // as well as the encryption based on encryption variable
                  const decrypted = JSON.parse(self.decrypt(response.data.decryptedMessage));
                  decrypted.confirmed = true;

                  if (table !== 'users') {
                    decrypted.user = recordsDetails[p] ? recordsDetails[p].user : null;
                  }

                  decrypted.public_key = recordsDetails[p]
                    ? recordsDetails[p].recipientPublicKey : null;

                  decryptedRecords.push(decrypted);
                } catch (e) {
                  logger.error(e);
                }
                recordCounter += 1;

                if (recordCounter === completedNumber) {
                  eventEmitter.emit('check_on_pending');
                }
              })
              .catch((error) => {
                logger.error(error);
                reject(error);
              });
          });
        }
      });

      eventEmitter.on('table_retrieved', () => {
        for (let position = 0; position < Object.keys(tableData).length; position += 1) {
          const obj = tableData[position];
          let completion = false;
          if (obj.attachment.encryptedMessage.data && obj.recipientRS !== recordTable.address) {
            if (scope.show_pending && scope.show_pending > 0) {
              if (obj.confirmations <= scope.show_pending) {
                pendingRecords.push(obj.transaction);
                pendingNumber += 1;
              } else {
                records.push(obj.transaction);
                completedNumber += 1;
              }
            } else if (scope.size === 'all') {
              records.push(obj.transaction);
              completedNumber += 1;
            } else if (scope.size === 'last') {
              records.push(obj.transaction);
              recordsFound += 1;
              completedNumber += 1;
              completion = true;
            }

            recordsDetails[obj.transaction] = {
              recipientPublicKey: obj.attachment.recipientPublicKey,
              user: obj.recipientRS === recordTable.address ? obj.senderRS : obj.recipientRS,
              userId: obj.recipientRS === recordTable.address ? obj.sender : obj.recipient,

            };
            recordsFound += 1;
          }
          if (completion) {
            break;
          }
        }
        eventEmitter.emit('records_retrieved');
      });

      eventEmitter.on('table_access_retrieved', () => {
        axios.get(`${self.jupiter_data.server}/nxt?requestType=getBlockchainTransactions&account=${recordTable.address}&withMessage=true&type=1`)
          .then((response) => {
            tableData = response.data.transactions;
            eventEmitter.emit('table_retrieved');
          })
          .catch((error) => {
            logger.error(error);
            reject({ success: false, errors: error });
          });
      });

      logger.debug(`getAllRecords().loadAppData()`);
      self.loadAppData(scope.containedDatabase)
        .then((res) => {
          database = res.app.tables;
          Object.keys(database).forEach((x) => {
            if (database[x][table]) {
              recordTable = database[x][table];
            }
          });
          eventEmitter.emit('table_access_retrieved');
        })
        .catch((err) => {
          logger.error(err);
          reject('There was an error');
        });
    });
  }

  // This method retrieves user info based on the account and the passphrase given
  getUser(account, passphrase, containedDatabase = null) {
    logger.silly(`getUser()`);
    const self = this;
    return new Promise((resolve, reject) => {
      if (account === process.env.APP_ACCOUNT_ADDRESS) {
        const userObject = {
          account,
          id: process.env.APP_ACCOUNT_ID,
          email: process.env.APP_EMAIL,
          firstname: 'Admin',
          lastname: '',
          secret_key: null,
          twofa_enabled: false,
          twofa_completed: false,
          public_key: process.env.APP_PUBLIC_KEY,
          api_key: process.env.APP_API_KEY,
          admin: true,
          secret: process.env.APP_PASSPHRASE,
        };
        resolve({ user: JSON.stringify(userObject) });
      } else if (containedDatabase) {
        logger.info('Retrieving database from the user');
        self.retrieveUserFromPassphrase(containedDatabase)
          .then((response) => {
            if (response.databaseFound && !response.userNeedsSave) {
              resolve(response);
            } else if (response.userRecord) {
              const currentDatabase = self.tableBreakdown(response.tables);
              const returnData = {
                recordsFound: 1,
                user: response.userRecord,
                noUserTables: !currentDatabase.includes('users'),
                userNeedsSave: true,
                userRecordFound: true,
                databaseFound: true,
                tables: response.tables,
                tableList: response.tableList,
              };
              resolve(returnData);
            } else {
              logger.info(response);
              logger.info('Retrieved database from the app now');
              self.retrieveUserFromApp(account, passphrase)
                .then((res) => {
                  res.noUserTables = response.noUserTables;
                  res.databaseFound = response.databaseFound;
                  res.database = response.database;
                  res.userNeedsSave = response.userNeedsSave;
                  res.tables = response.tables;
                  logger.info(res);
                  resolve(res);
                })
                .catch((error) => {
                  logger.info('This is the first stage');
                  reject(error);
                });
            }
          })
          .catch((error) => {
            logger.info('This is the second stage');
            reject(error);
          });
      } else {
        self.retrieveUserFromApp(account, passphrase)
          .then((response) => {
            resolve(response);
          })
          .catch((error) => {
            logger.info('This third the second stage');
            reject(error);
          });
      }
    });
  }

  retrieveUserFromPassphrase(accessData) {
    logger.silly(`retrieveUserFromPassphrase()`)
    const eventEmitter = new events.EventEmitter();
    const self = this;
    const { passphrase } = accessData;
    let tableList;
    // const { account } = accessData;

    return new Promise((resolve, reject) => {
      const records = [];
      const decryptedRecords = [];
      let database;
      let recordTable;
      let tableData;
      let completedNumber = 0;
      let recordsFound = 0;
      let userRecord;

      eventEmitter.on('set_responseData', () => {
        if (decryptedRecords[0] === undefined
          || decryptedRecords[0].user_record === undefined) {
          resolve({
            userRecord,
            tableList,
            noUserTables: false,
            tables: database,
            databaseFound: true,
            userNeedsSave: true,
          });
        } else {
          resolve({
            recordsFound,
            database,
            tables: undefined,
            user: decryptedRecords[0].user_record,
            databaseFound: true,
            userNeedsSave: false,
          });
        }
      });

      eventEmitter.on('check_on_pending', () => {
        eventEmitter.emit('set_responseData');
      });

      eventEmitter.on('records_retrieved', () => {
        if (Object.keys(records).length <= 0) {
          eventEmitter.emit('check_on_pending');
        } else {
          let recordCounter = 0;
          records.forEach((p) => {
            const thisUrl = `${self.jupiter_data.server}/nxt?requestType=readMessage&transaction=${p}&secretPhrase=${passphrase}`;

            axios.get(thisUrl)
              .then((response) => {
                try {
                  // This decrypts the message from the blockchain using native encryption
                  // as well as the encryption based on encryption variable
                  const decrypted = JSON.parse(
                    self.decrypt(response.data.decryptedMessage,
                      accessData.encryptionPassword),
                  );
                  // console.log(decrypted);
                  decryptedRecords.push(decrypted);
                } catch (e) {
                  logger.error(e);
                }
                recordCounter += 1;

                if (recordCounter === completedNumber) {
                  eventEmitter.emit('check_on_pending');
                }
              })
              .catch((error) => {
                logger.error(error);
                reject(error);
              });
          });
        }
      });

      eventEmitter.on('table_retrieved', () => {
        Object.keys(tableData).some((position) => {
          const obj = tableData[position];
          let completion = false;
          if (obj.attachment.encryptedMessage.data
            && (obj.recipientRS === recordTable.address
              || obj.senderRS === recordTable.address
            )
          ) {
            records.push(obj.transaction);
            recordsFound += 1;
            completedNumber += 1;
            completion = true;
          }
          return completion;
        });
        eventEmitter.emit('records_retrieved');
      });

      eventEmitter.on('table_access_retrieved', () => {
        axios.get(`${self.jupiter_data.server}/nxt?requestType=getBlockchainTransactions&account=${recordTable.address}&withMessage=true&type=1`)
          .then((response) => {
            tableData = response.data.transactions;
            eventEmitter.emit('table_retrieved');
          })
          .catch((error) => {
            logger.error(error);
            reject({ success: false, errors: error });
          });
      });
      self.loadAppData(accessData)
        .then((res) => {
          database = res.app.tables;
          tableList = res.tables;
          ({ userRecord } = res);
          if (res.hasUserTable) {
            Object.keys(database).forEach((x) => {
              if (database[x].users) {
                recordTable = database[x].users;
              }
            });
            eventEmitter.emit('table_access_retrieved');
          } else {
            resolve({
              tableList,
              success: false,
              noUserTables: true,
              tables: database,
              userRecord: res.userRecord,
            });
          }
        })
        .catch((err) => {
          logger.error(err);
          reject('There was an error');
        });
    });
  }

  retrieveUserFromApp(account, passphrase) {
    logger.silly(`retrieveUserFromApp()`)
    const eventEmitter = new events.EventEmitter();
    const self = this;

    return new Promise((resolve, reject) => {
      const records = [];
      const decryptedRecords = [];
      let responseData;
      let database;
      let recordTable;
      let tableData;
      let completedNumber = 0;
      let recordsFound = 0;

      eventEmitter.on('set_responseData', () => {
        if (decryptedRecords[0] === undefined
          || decryptedRecords[0].user_record === undefined) {
          resolve({ error: true, message: 'Account not on file!' });
        } else {
          responseData = { recordsFound, user: decryptedRecords[0].user_record };
          resolve(responseData);
        }
      });

      eventEmitter.on('check_on_pending', () => {
        eventEmitter.emit('set_responseData');
      });

      eventEmitter.on('records_retrieved', () => {
        if (Object.keys(records).length <= 0) {
          eventEmitter.emit('check_on_pending');
        } else {
          let recordCounter = 0;
          records.forEach((p) => {
            const thisUrl = `${self.jupiter_data.server}/nxt?requestType=readMessage&transaction=${p}&secretPhrase=${passphrase}`;

            axios.get(thisUrl)
              .then((response) => {
                try {
                  // This decrypts the message from the blockchain using native encryption
                  // as well as the encryption based on encryption variable
                  const decrypted = JSON.parse(self.decrypt(response.data.decryptedMessage));
                  decryptedRecords.push(decrypted);
                } catch (e) {
                  logger.error(e);
                }
                recordCounter += 1;

                if (recordCounter === completedNumber) {
                  eventEmitter.emit('check_on_pending');
                }
              })
              .catch((error) => {
                logger.error(error);
                reject(error);
              });
          });
        }
      });

      eventEmitter.on('table_retrieved', () => {
        Object.keys(tableData).some((position) => {
          const obj = tableData[position];
          let completion = false;
          if (obj.attachment.encryptedMessage.data && obj.recipientRS === account) {
            records.push(obj.transaction);
            recordsFound += 1;
            completedNumber += 1;
            completion = true;
          }
          return completion;
        });
        eventEmitter.emit('records_retrieved');
      });

      eventEmitter.on('table_access_retrieved', () => {
        axios.get(`${self.jupiter_data.server}/nxt?requestType=getBlockchainTransactions&account=${recordTable.address}&withMessage=true&type=1`)
          .then((response) => {
            tableData = response.data.transactions;
            eventEmitter.emit('table_retrieved');
          })
          .catch((error) => {
            logger.error(error);
            reject({ success: false, errors: error });
          });
      });

      self.loadAppData()
        .then((res) => {
          database = res.app.tables;
          Object.keys(database).forEach((x) => {
            if (database[x].users) {
              recordTable = database[x].users;
            }
          });
          eventEmitter.emit('table_access_retrieved');
        })
        .catch((err) => {
          logger.error(err);
          reject('There was an error');
        });
    });
  }

  // This method retrieves record info based on the table and id number given
  findById(id, model) {
    const eventEmitter = new events.EventEmitter();
    const self = this;
    const sameId = [];
    let allRecords = [];

    return new Promise((resolve, reject) => {
      const Record = require(`../../models/${model}`);
      const record = new Record({ id: null });

      eventEmitter.on('records_retrieved', () => {
        // let userAddress;
        /* Object.keys(allRecords).forEach((x) => {
          if (allRecords[x].id && allRecords[x].id === id) {
            sameId.push(JSON.parse(allRecords[x][`${model}_record`]));
          }
        }); */

        for (let x = 0; x < Object.keys(allRecords).length; x += 1) {
          if (allRecords[x].id && allRecords[x].id === id) {
            sameId.push(JSON.parse(allRecords[x][`${model}_record`]));
          }
        }
        self.sortByDate(sameId);
        resolve({ success: true, record: sameId[0] });
      });

      self.getAllRecords(record.table)
        .then((response) => {
          allRecords = response.records;
          eventEmitter.emit('records_retrieved');
        })
        .catch((error) => {
          logger.error(error);
          reject({ success: false, errors: error });
        });
    });
  }

  getBalance(address, accountId, jupServ) {
    logger.silly(`getBalance()`)
    const self = this;
    const eventEmitter = new events.EventEmitter();
    let account;
    const addressOwner = address || process.env.APP_PASSPHRASE;
    const server = jupServ || process.env.JUPITER_SERVER;

    return new Promise((resolve, reject) => {
      if (!addressOwner || !server) {
        return reject({ success: false, message: 'Missing parameters' });
      }

      eventEmitter.on('account_retrieved', () => {
        axios.post(`${server}/nxt?requestType=getBalance&account=${account}`)
          .then((response) => {
            if (response.data.errorDescription) {
              reject(response.data);
            } else {
              logger.info(`Balance: ${(parseFloat(response.data.balanceNQT) / (10 ** self.jupiter_data.moneyDecimals))} JUP.`);
              let minimumAppBalance = false;
              let minimumTableBalance = false;

              if (response.data.balanceNQT >= self.jupiter_data.minimumAppBalance) {
                minimumAppBalance = true;
              }

              if (response.data.balanceNQT >= self.jupiter_data.minimumTableBalance) {
                minimumTableBalance = true;
              }

              const responseData = {
                minimumAppBalance,
                minimumTableBalance,
                balance: response.data.balanceNQT,
                minAppBalanceAmount: self.jupiter_data.minimumAppBalance,
                minTableBalanceAmount: self.jupiter_data.minimumTableBalance,
              };
              resolve(responseData);
            }
          })
          .catch((error) => {
            logger.error(error);
            reject({ success: false, message: 'There was an error obtaining account Jupiter balance' });
          });
      });

      if (!accountId) {
        axios.get(`${server}/nxt?requestType=getAccountId&secretPhrase=${addressOwner}`)
          .then((response) => {
            ({ account } = response.data);
            eventEmitter.emit('account_retrieved');
          })
          .catch((error) => {
            logger.error(error);
            reject({ success: false, message: 'There was an error obtaining account Jupiter balance' });
          });
      } else {
        account = accountId;
        eventEmitter.emit('account_retrieved');
      }
    });
  }

  sendMoney(recipientAddress, transferAmount, senderPassphrase = process.env.APP_PASSPHRASE) {
    logger.silly('+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++')
    logger.silly(`++ Transferring Money`);
    logger.silly(`++ from: ${senderPassphrase.substring(0,5)}`);
    logger.silly(`++ to: ${recipientAddress}`);
    logger.silly(`++ amount: ${transferAmount}`);
    logger.silly('+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++')


    const fee = ApiConfig.minimumFee;
    // const senderAddress = senderPassphrase || process.env.APP_PASSPHRASE;
    // const server = process.env.JUPITER_SERVER;

    return new Promise((resolve, reject) => {
      if (!recipientAddress) {

      }
      if(!senderPassphrase){
        return reject({ error: true, data: 'senderPassphrase missing' });
      }
      if(!transferAmount){
        return reject({ error: true, data: 'transferAmount  missing' });
      }

      return axios.post(`${this.jupiter_data.server}/nxt?requestType=sendMoney&secretPhrase=${senderPassphrase}&recipient=${recipientAddress}&amountNQT=${transferAmount}&feeNQT=${fee}&deadline=${this.jupiter_data.deadline}`)
        .then((response) => {
          if (response.data.signatureHash != null) {
            return resolve({ success: true, data: response.data });
          }
          logger.error('Cannot send Jupiter to new account, Jupiter issuer has insufficient balance!');
          logger.debug(`sender=${senderPassphrase.substring(0,5)}  to=${recipientAddress}`)
          return reject({ error: true, data: response.data });
        })
        .catch(error => reject({ error: true, fullError: error }));
    });
  }

  // We use axios to make the connection to pimcore server
  request(method, url, data, callback) {
    return axios({
      url,
      method,
      data,
    })
      .then((res) => {
        if (res.data) {
          // If callback exists, it is executed with axios response as a param
          if (callback) {
            return callback(res.data);
          }
          return res.data;
        }
        return ({ error: true, message: 'There was an error with the request' });
      })
      .catch(error => ({
        error: true,
        message: 'There was an error making axios request',
        fullError: error,
      }));
  }

  jupiterURL(givenParams) {
    const params = givenParams;
    if (!params.deadline) {
      params.deadline = this.jupiter_data.deadline;
    }

    if (!params.feeNQT) {
      params.feeNQT = this.jupiter_data.feeNQT;
    }

    const urlParams = Object.keys(params);
    let url = `${this.jupiter_data.server}/nxt?`;

    for (let x = 0; x < urlParams.length; x += 1) {
      const thisParam = urlParams[x];

      if (x === 0) {
        url += `${thisParam}=${params[thisParam]}`;
      } else {
        url += `&${thisParam}=${params[thisParam]}`;
      }
    }

    return url;
  }

  async jupiterRequest(rtype, params, data = {}, callback) {
    const url = this.jupiterURL(params);

    const response = await this.request(rtype, url, data, callback);

    return response;
  }

  async getAlias(aliasName) {
    const aliasCheckup = await this.jupiterRequest('get', {
      aliasName,
      requestType: 'getAlias',
    });

    if (
      aliasCheckup.errorDescription
      && aliasCheckup.errorDescription === 'Unknown alias'
    ) {
      return { available: true };
    }

    if (aliasCheckup.errorDescription) {
      aliasCheckup.error = true;
      return { aliasCheckup };
    }

    return aliasCheckup;
  }

  async setAlias(params) {
    logger.info(params);
    return this.jupiterRequest('post', {
      requestType: 'setAlias',
      aliasName: params.alias,
      secretPhrase: params.passphrase,
      aliasURI: `acct:${params.account}@nxt`,
      feeNQT: 80,
    });
  }

  async deleteAlias(params) {
    return this.jupiterRequest('post', {
      requestType: 'deleteAlias',
      aliasName: params.alias,
      secretPhrase: params.passphrase,
      feeNQT: 80,
    });
  }

  async startFundingMonitor(params) {
    return this.jupiterRequest('post', {
      requestType: 'startFundingMonitor',
      property: params.fundingProperty || this.fundingProperty,
      secretPhrase: params.passphrase,
      feeNQT: 80,
      amount: params.amount || parseInt(this.jupiter_data.minimumTableBalance, 10),
      threshold: params.threshold || parseInt(this.jupiter_data.minimumTableBalance / 2, 10),
      interval: 10,
    });
  }

  async getFundingMonitor(params = {}) {
    return this.jupiterRequest('post', {
      requestType: 'getFundingMonitor',
      property: params.fundingProperty || this.fundingProperty,
      secretPhrase: params.passphrase || process.env.APP_PASSPHRASE,
      includeMonitoredAccounts: params.includeAccounts || false,
    });
  }


  async stopFundingMonitor(params) {
    return this.jupiterRequest('post', {
      requestType: 'stopFundingMonitor',
      property: params.fundingProperty || this.fundingProperty,
      secretPhrase: params.passphrase,
      feeNQT: 80,
    });
  }

  async setProperty(params) {
    return this.jupiterRequest('post', {
      requestType: 'startFundingMonitor',
      recipient: params.recipient,
      property: params.property,
      value: params.value,
      secretPhrase: params.passphrase,
      feeNQT: 80,
      interval: 10,
    });
  }

  async setFundingProperty(params) {
    const threshold = params.threshold || parseInt(this.jupiter_data.minimumTableBalance / 2, 10);

    return this.jupiterRequest('post', {
      requestType: 'startFundingMonitor',
      recipient: params.recipient,
      property: params.property || this.fundingProperty,
      value: params.value || `{"threshold":"${threshold}"}`,
      secretPhrase: params.passphrase,
      feeNQT: 80,
      amount: params.amount || parseInt(this.jupiter_data.minimumTableBalance, 10),
      interval: 10,
      threshold,
    });
  }

  async getAccountProperties(params) {
    return this.jupiterRequest('get', {
      requestType: 'getAccountProperties',
      recipient: params.recipient,
    });
  }

  async setAcountProperty(params) {
    const threshold = params.threshold || parseInt(this.jupiter_data.minimumTableBalance / 2, 10);

    return this.jupiterRequest('post', {
      requestType: 'setAccountProperty',
      secretPhrase: params.passphrase || process.env.APP_PASSPHRASE,
      recipient: params.recipient,
      property: params.property || this.fundingProperty,
      feeNQT: params.feeNQT || 10,
      value: params.value || `{"threshold":"${threshold}"}`,
    });
  }

  async deleteAccountProperty(params) {
    return this.jupiterRequest('post', {
      requestType: 'deleteAccountProperty',
      recipient: params.recipient,
      property: params.property,
      secretPhrase: params.passphrase,
      feeNQT: params.feeNQT || 10,
      deadline: params.deadline || 60,
    });
  }

  async hasFundingProperty(params) {
    const { properties } = await this.getAccountProperties(params);
    const self = this;
    let hasFundingProperty = false;

    for (let x = 0; x < properties.length; x += 1) {
      const thisProperty = properties[x];
      if (thisProperty.property === self.fundingProperty) {
        hasFundingProperty = true;
      }
    }

    return hasFundingProperty;
  }

  async sendMessage(
    data,
    passphrase,
    recipientRS,
    recipientPublicKey,
    config = { appEncryption: false, specialEncryption: false },
  ) {
    logger.silly(`sendMessage()`);
    let dataToBeSent;
    let callUrl;
    let response;

    if (config.appEncryption) {
      dataToBeSent = this.encrypt(data);
    } else {
      dataToBeSent = data;
    }
    let recipient;
    let aliasResponse;

    if (!recipientRS.toLowerCase().includes('jup-')) {
      aliasResponse = (await this.getAlias(recipientRS));
      logger.info(aliasResponse);
      recipient = aliasResponse.accountRS;
    } else {
      recipient = recipientRS;
    }

    if (!recipient) {
      return { error: true, message: 'Incorrect recipient', fullError: aliasResponse };
    }

    if (recipientPublicKey) {
      callUrl = `${this.jupiter_data.server}/nxt?requestType=sendMessage&secretPhrase=${passphrase}&recipient=${recipient}&messageToEncrypt=${dataToBeSent}&feeNQT=${this.jupiter_data.feeNQT}&deadline=${this.jupiter_data.deadline}&recipientPublicKey=${recipientPublicKey}&compressMessageToEncrypt=true`;
    } else {
      callUrl = `${this.jupiter_data.server}/nxt?requestType=sendMessage&secretPhrase=${passphrase}&recipient=${recipient}&messageToEncrypt=${dataToBeSent}&feeNQT=${this.jupiter_data.feeNQT}&deadline=${this.jupiter_data.deadline}&messageIsPrunable=true&compressMessageToEncrypt=true`;
    }

    logger.info(callUrl);

    try {
      response = await axios.post(callUrl);

      if (response.data.broadcasted && response.data.broadcasted === true) {
        return ({ success: true, message: 'Message sent' });
      }
      return ({ error: true, fullError: response.data });
    } catch (e) {
      return ({ error: true, fullError: e });
    }
  }

  createNewAddress(passphrase) {
    const self = this;
    return new Promise((resolve, reject) => {
      axios.get(`${self.jupiter_data.server}/nxt?requestType=getAccountId&secretPhrase=${passphrase}`)
        .then((response) => {
          const address = response.data.accountRS;
          resolve({ address, publicKey: response.data.publicKey, success: true });
        })
        .catch((error) => {
          logger.error(error);
          logger.info('There was an error in address creation');
          reject({ success: false, message: 'There was an error creating a new Jupiter address' });
        });
    });
  }

  getAccountInformation(passphrase) {
    const self = this;
    return new Promise((resolve, reject) => {
      axios.get(`${self.jupiter_data.server}/nxt?requestType=getAccountId&secretPhrase=${passphrase}`)
        .then((response) => {
          const address = response.data.accountRS;
          resolve({
            address,
            accountId: response.data.account,
            publicKey: response.data.publicKey,
            success: true,
          });
        })
        .catch((error) => {
          logger.error(error);
          logger.info('There was an error in address creation');
          reject({ success: false, message: 'There was an error in getting account information' });
        });
    });
  }

  async attachTable(database, tableName, currentTables = null, initialBalance) {
    logger.silly(`attachTable()`)
    const eventEmitter = new events.EventEmitter();
    const self = this;
    // let valid_table = true;
    let tableList = [];
    // let app;
    let address;
    let passphrase;
    // let current_tables;
    let record;
    let tableListRecord;
    // let table_created = true;

    return new Promise((resolve, reject) => {
      eventEmitter.on('insufficient_balance', () => {
        reject("Please send JUP to your app's address and retry command");
      });

      eventEmitter.on('table_created', () => {
        // This code will send Jupiter to the recently created table address so that it is
        // able to record information
        self.sendMoney(address, initialBalance)
          .then((response) => {
            logger.info(`Table ${tableName} funded with JUP.`);
            resolve({
              success: true,
              message: `Table ${tableName} pushed to the blockchain and funded.`,
              data: response.data,
              jupiter_response: response.data,
              tables: tableList,
              others: self.tables,
            });
          })
          .catch((err) => {
            logger.error(err);
            reject({ success: false, message: 'Unable to send Jupiter to new table address' });
          });
      });

      eventEmitter.on('address_retrieved', async () => {
        const encryptedData = self.encrypt(JSON.stringify(record), database.encryptionPassword);

        if (tableName === 'channels' && tableListRecord.tables.length < 2) {
          tableListRecord.tables = ['users', 'channels'];
        }

        if (tableName === 'invites' && tableListRecord.tables.length < 3) {
          tableListRecord.tables = ['users', 'channels', 'invites'];
        }

        if (tableName === 'storage' && tableListRecord.tables.length < 4) {
          tableListRecord.tables = ['users', 'channels', 'invites', 'storage'];
        }

        const encryptedTableData = self.encrypt(
          JSON.stringify(tableListRecord),
          database.encryptionPassword,
        );
        const fee = 40000; //TODO handle this fee with a call to jupiter
        const callUrl = `${self.jupiter_data.server}/nxt?messageIsPrunable=false&requestType=sendMessage&secretPhrase=${database.passphrase}&recipient=${database.account}&messageToEncrypt=${encryptedData}&feeNQT=${fee}&deadline=${self.jupiter_data.deadline}&recipientPublicKey=${database.publicKey}&compressMessageToEncrypt=true`;

        let response;

        try {
          response = await axios.post(callUrl);
        } catch (e) {
          logger.error(e);
          response = { error: true, fullError: e };
        }

        if (response.data.broadcasted && !response.error) {
          logger.info(`Table ${tableName} pushed to the blockchain and linked to your account.`);
          const tableListUpdateUrl = `${self.jupiter_data.server}/nxt?messageIsPrunable=false&requestType=sendMessage&secretPhrase=${database.passphrase}&recipient=${database.account}&messageToEncrypt=${encryptedTableData}&feeNQT=${fee}&deadline=${self.jupiter_data.deadline}&recipientPublicKey=${database.publicKey}&compressMessageToEncrypt=true`;

          try {
            response = await axios.post(tableListUpdateUrl);
          } catch (e) {
            logger.error(e);
            response = { error: true, fullError: e };
          }

          if (response.data && response.data.broadcasted && response.data.broadcasted === true) {
            eventEmitter.emit('table_created');
          } else if (response.data && response.data.errorDescription != null) {
            reject({
              success: false,
              message: response.data.errorDescription,
              jupiter_response: response.data,
            });
          } else {
            reject({
              success: false,
              message: 'There was an error',
              fullError: response,
            });
          }
        } else if (response.data.errorDescription != null) {
          logger.info('There was an Error');
          logger.info(response);
          logger.info(response.data);
          logger.error(`Error: ${response.data.errorDescription}`);
          reject({
            success: false,
            message: response.data.errorDescription,
            jupiter_response: response.data,
          });
        } else {
          logger.info('Unable to save data in the blockchain');
          logger.info(response.data);
          reject({ success: false, message: 'Unable to save data in the blockchain', jupiter_response: response.data });
        }
      });

      eventEmitter.on('tableName_obtained', () => {
        logger.info('These are the tables');
        logger.info(self.tables);
        logger.info(tableList);
        logger.info(currentTables);
        // let databaseCurrentTableMatch = true;
        let tableInCurrentTableList = true;
        if (currentTables) {
          if (!(tableList.includes(tableName) && currentTables.includes(tableName))) {
            tableInCurrentTableList = currentTables.includes(tableName);
          }
        }

        if ((
          self.tables.indexOf(tableName) >= 0 || tableList.indexOf(tableName) >= 0)
          && tableInCurrentTableList
        ) {
          reject(`Error: Unable to save table. ${tableName} is already in the database`);
        } else {
          passphrase = self.generate_passphrase();

          self.createNewAddress(passphrase)
            .then((response) => {
              if (response.success === true && response.address && response.address.length > 0) {
                ({ address } = response);
                record = {
                  [tableName]: {
                    address,
                    passphrase,
                    public_key: response.public_key,
                  },
                };
                tableList.push(tableName);
                tableListRecord = {
                  tables: tableList,
                  date: Date.now(),
                };

                eventEmitter.emit('address_retrieved');
              } else {
                logger.error(response);
                reject('There was an error');
              }
            })
            .catch((error) => {
              logger.error(error);
              reject('Error creating Jupiter address for your table.');
            });
        }
      });

      eventEmitter.on('verified_balance', () => {
        self.loadAppData(database)
          .then((response) => {
            console.log('LOAD DATA-----------------------', response);
            if (response.tables === undefined
              || response.tables == null
              || response.tables.length === 0) {
              tableList = [];
            } else {
              tableList = response.tables;
            }

            if (tableName === 'undefined' || tableName === undefined) {
              reject('Table name cannot be undefined');
            } else {
              eventEmitter.emit('tableName_obtained');
            }
          })
          .catch((error) => {
            logger.error(error);
            reject('Error in creating table');
          });
      });

      eventEmitter.emit('verified_balance');
    });
  }

  async getUnconfirmedData(address, passphrase, filter = {}, accessData) {
    const self = this;
    const unconfirmedData = [];

    let response;
    try {
      response = await axios.get(`${self.jupiter_data.server}/nxt?requestType=getUnconfirmedTransactions&account=${address}`);
    } catch (e) {
      response = ({ error: true, errors: e });
    }

    if (response.error) {
      return response;
    }

    const transactions = response.data.unconfirmedTransactions || [];

    for (let x = 0; x < transactions.length; x += 1) {
      const thisTransaction = transactions[x];

      // We use filters to remove unnecessary information
      if (
        (thisTransaction.senderRS === address
        || thisTransaction.recipientRS === address)
        && (
          thisTransaction.senderRS === filter.account
          || thisTransaction.recipientRS === filter.account
          || !filter.account
        )
      ) {
        const dataObject = {
          signature: thisTransaction.signature,
          fee: thisTransaction.feeNQT,
          sender: thisTransaction.senderRS,
          recipient: thisTransaction.recipientRS,
        };
        let decryptedData;

        try {
          // eslint-disable-next-line no-await-in-loop
          decryptedData = await self.decryptFromRecord(thisTransaction, address, passphrase);
        } catch (e) {
          logger.error(e);
          decryptedData = e;
        }

        try {
          let unconfirmedDataObject;

          if (accessData) {
            unconfirmedDataObject = JSON.parse(self.decrypt(
              decryptedData.decryptedMessage,
              accessData.encryptionPassword,
            ));
          }

          if (!unconfirmedDataObject) {
            unconfirmedDataObject = JSON.parse(self.decrypt(decryptedData.decryptedMessage));
          }
          dataObject.data = unconfirmedDataObject || decryptedData;
        } catch (e) {
          dataObject.data = decryptedData;
        }
        dataObject.data.confirmed = false;
        unconfirmedData.push(dataObject);
      }
    }

    return unconfirmedData;
  }

  async getTransactions(filter) {
    logger.silly(`getTransactions()`)
    const self = this;
    let address;
    const validTransactions = [];

    if (typeof filter === 'object') {
      address = filter.account;
    } else {
      address = filter;
    }

    let rawTransactions;
    let rawUnconfirmedTransactions;
    let transactions;

    if (!filter.noUnconfirmed) {
      try {
        rawUnconfirmedTransactions = (await axios.get(`${this.jupiter_data.server}/nxt?requestType=getUnconfirmedTransactions&account=${address}`)).data;
      } catch (e) {
        logger.error('Error in gravity.js, line 1662, could not retrieve unconfirmed transactions');
        return { error: true, fullError: e };
      }
      transactions = _.get(rawUnconfirmedTransactions, 'unconfirmedTransactions', []);
      for (let x = 0; x < transactions.length; x += 1) {
        const thisTransaction = transactions[x];
        thisTransaction.confirmed = false;
        if (self.validateTransaction(thisTransaction, filter)) {
          validTransactions.push(thisTransaction);
        }
      }
    }

    if (!filter.noConfirmed) {
      try {
        const numberOfRecords = filter.numberOfRecords || 10;
        const firstIndex = filter.firstIndex || 0;
        const lastIndex = parseInt(firstIndex, 10) + parseInt(numberOfRecords, 10);
        const urlCall = `${this.jupiter_data.server}/nxt?requestType=getBlockchainTransactions&account=${address}&withMessage=true&type=1&firstIndex=${firstIndex}&lastIndex=${lastIndex}`;
        // console.log(urlCall);
        rawTransactions = (await axios.get(urlCall)).data;
      } catch (e) {
        logger.error('Error in gravity.js, line 1671, could not retrieve unconfirmed transactions');
        return { error: true, fullError: e };
      }
      transactions = _.get(rawTransactions, 'transactions', []);
      for (let x = 0; x < transactions.length; x += 1) {
        const thisTransaction = transactions[x];
        thisTransaction.confirmed = true;
        if (self.validateTransaction(thisTransaction, filter)) {
          validTransactions.push(thisTransaction);
        }
      }
    }

    return validTransactions;
  }

  async decryptSingleTransaction(thisTransaction, filter) {
    const dataObject = {
      signature: thisTransaction.signature,
      fee: thisTransaction.feeNQT,
      sender: thisTransaction.senderRS,
      recipient: thisTransaction.recipientRS,
      fullRecord: thisTransaction,
      confirmed: thisTransaction.confirmed,
    };
    let decryptedData;
    const encryptionPassword = filter.encryptionPassword || this.appPassword;
    const encryptionPassphrase = filter.encryptionPassphrase || process.env.APP_PASSPHRASE;
    let unEncryptedData;
    let encryptionLevel;

    if (!filter.blockchainEncryptionDisabled && thisTransaction.confirmed) {
      try {
        // eslint-disable-next-line no-await-in-loop
        decryptedData = await this.decryptMessage(
          thisTransaction.transaction,
          encryptionPassphrase,
        );
        if (decryptedData.errorDescription) {
          decryptedData = undefined;
        }
      } catch (e) {
        logger.error(e);
        logger.error('Error: Gravity file, line 1741, failed to decrypt message');
      }
    }

    if (filter.includeUnconfirmed && !thisTransaction.confirmed) {
      let targetAccount;
      if (!filter.targetAccount && filter.multiChannel) {
        targetAccount = thisTransaction.senderRS;
      }

      try {
        // eslint-disable-next-line no-await-in-loop
        const response = await this.decryptFromRecord(
          thisTransaction,
          targetAccount,
          encryptionPassphrase,
        );

        if (response.errorDescription) {
          decryptedData = undefined;
        } else {
          decryptedData = response;
        }
      } catch (e) {
        logger.error(e);
        logger.error('Error: Gravity file, line 1760, failed to decrypt message');
      }
    }

    if (decryptedData) {
      try {
        unEncryptedData = this.decrypt(
          decryptedData.decryptedMessage,
          encryptionPassword,
        );
        encryptionLevel = 'channel';
      } catch (e) {
        logger.error(e);
        logger.error('Error: Gravity file, line 2147, failed to decrypt messagee');
        try {
          unEncryptedData = this.decrypt(
            decryptedData.decryptedMessage,
            process.env.ENCRYPT_PASSWORD,
          );
          encryptionLevel = 'app';
        } catch (err) {
          logger.error(e);
          logger.error('Error: Gravity file, line 2155, failed to decrypt messagee');
        }
      }
    } else if (filter.blockchainEncryptionDisabled) {
      try {
        unEncryptedData = this.decrypt(
          thisTransaction.attachment.message,
          encryptionPassword,
        );
      } catch (e) {
        logger.error(e);
        logger.error('Error: Gravity file, line 1782, failed to decrypt thisTransaction.attachment.message');
      }
    }

    if (!unEncryptedData) {
      return { error: true, message: 'Cannot be encrypted' };
    }

    if (filter.dataLink) {
      dataObject.data = JSON.parse(JSON.parse(unEncryptedData)[filter.dataLink]);
      dataObject.data.date = JSON.parse(unEncryptedData).date;
    } else {
      dataObject.data = JSON.parse(unEncryptedData);
    }
    dataObject.date = dataObject.data.date || thisTransaction.fullRecord.date;
    dataObject.data.encryptionLevel = encryptionLevel;
    dataObject.encryptionLevel = encryptionLevel;

    // console.log(dataObject);

    return dataObject;
  }

  async getDataTransactions(filter) {
    logger.silly(`getDataTransactions()`)
    // Filter must always contain an account
    // but it can be just the address if that is all devs are looking
    const dataTransactions = [];
    let query;

    if (typeof filter === 'string') {
      query = { account: filter, hasAttachment: true };
    } else if (typeof filter === 'object') {
      query = filter;
      query.hasAttachment = true;
    } else {
      return { error: true, message: 'Invalid account or filter data' };
    }

    const transactions = await this.getTransactions(query);

    if (!transactions.error) {
      for (let x = 0; x < transactions.length; x += 1) {
        const thisTransaction = transactions[x];
        let proceed = true;

        if (filter.noConfirmed && thisTransaction.confirmed) {
          proceed = false;
        }

        if (filter.noUnconfirmed && !thisTransaction.confirmed) {
          proceed = false;
        }

        if (proceed) {
          // eslint-disable-next-line no-await-in-loop
          const dataObject = await this.decryptSingleTransaction(thisTransaction, filter);
          if (!dataObject.error) {
            dataTransactions.push(dataObject);
          }
        }
      }
      if (dataTransactions.length > 1) {
        const order = filter.order || 'asc';
        this.sortByDate(dataTransactions, order);
      }
      // console.log(dataTransactions);

      return dataTransactions;
    }
    return transactions;
  }


  decryptFromRecord(transaction, address, passphrase) {
    const self = this;
    return new Promise((resolve, reject) => {
      if (transaction && transaction.attachment && transaction.attachment.encryptedMessage) {
        axios.get(`${self.jupiter_data.server}/nxt?requestType=decryptFrom&secretPhrase=${passphrase}&account=${address}&data=${transaction.attachment.encryptedMessage.data}&nonce=${transaction.attachment.encryptedMessage.nonce}`)
          .then((response) => {
            resolve(response.data);
          })
          .catch((error) => {
            reject({
              transaction,
              error: true,
              message: 'Error in retrieving first layer of decryption',
              fullError: error,
            });
          });
      } else {
        reject({ transaction, error: true, message: 'Incorrect transaction' });
      }
    });
  }

  //------------------------------------------------------------------------------------------
  // CONSOLE COMMANDS: This methods are related to database creation and can only be accessed
  // from the console. They generate files and make calls to Jupiter to record data
  //------------------------------------------------------------------------------------------

  makeQuestion(question) {
    const readline = require('readline');
    return new Promise((resolve, reject) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      rl.question(question, (answer) => {
        if (!answer) {
          reject('Answer cannot be undefined');
        } else {
          resolve(answer);
        }
        rl.close();
      });
    });
  }

  // This method creates a table
  createTable() {
    logger.silly(`createTable()`);

    const appAccount = process.env.APP_PASSPHRASE;
    const appAccountAddress = process.env.APP_ACCOUNT_ADDRESS;
    const appPublickKey = process.env.APP_PUBLIC_KEY;
    const eventEmitter = new events.EventEmitter();
    const self = this;
    // let valid_table = true;
    let tableList = [];
    // let app;
    let tableName;
    let address;
    let passphrase;
    // let current_tables;
    let record;
    let tableListRecord;
    // let table_created = true;

    return new Promise((resolve, reject) => {
      eventEmitter.on('insufficient_balance', () => {
        reject("Please send JUP to your app's address and retry command");
      });

      eventEmitter.on('table_created', () => {
        // This code will send Jupiter to the recently created table address so that it is
        // able to record information
        self.sendMoney(address)
          .then((response) => {
            logger.info(`Table ${tableName} funded with JUP.`);
            resolve({
              success: true,
              message: `Table ${tableName} pushed to the blockchain and funded.`,
              data: response.data,
              jupiter_response: response.data,
              tables: tableList,
              others: self.tables,
            });
          })
          .catch((err) => {
            logger.error(err);
            reject({ success: false, message: 'Unable to send Jupiter to new table address' });
          });
      });

      eventEmitter.on('address_retrieved', () => {
        const encryptedData = self.encrypt(JSON.stringify(record));
        const encryptedTableData = self.encrypt(JSON.stringify(tableListRecord));

        const callUrl = `${self.jupiter_data.server}/nxt?requestType=sendMessage&secretPhrase=${appAccount}&recipient=${appAccountAddress}&messageToEncrypt=${encryptedData}&feeNQT=${self.jupiter_data.feeNQT}&deadline=${self.jupiter_data.deadline}&recipientPublicKey=${appPublickKey}&compressMessageToEncrypt=true`;


        axios.post(callUrl)
          .then((response) => {
            if (response.data.broadcasted && response.data.broadcasted === true) {
              logger.info(`Table ${tableName} pushed to the blockchain and linked to your account.`);
              eventEmitter.emit('table_created');
            } else if (response.data.errorDescription != null) {
              logger.info('There was an Error');
              logger.info(response);
              logger.info(response.data);
              logger.error(`Error: ${response.data.errorDescription}`);
              reject({
                success: false,
                message: response.data.errorDescription,
                jupiter_response: response.data,
              });
            } else {
              logger.error('Unable to save data in the blockchain');
              logger.error(response.data);
              reject({ success: false, message: 'Unable to save data in the blockchain', jupiter_response: response.data });
            }
          })
          .catch((error) => {
            logger.error(error);
            reject({ success: false, message: 'There was an error', error: error.response });
          });

        const tableListUpdateUrl = `${self.jupiter_data.server}/nxt?requestType=sendMessage&secretPhrase=${appAccount}&recipient=${appAccountAddress}&messageToEncrypt=${encryptedTableData}&feeNQT=${(self.jupiter_data.feeNQT / 2)}&deadline=${self.jupiter_data.deadline}&recipientPublicKey=${appPublickKey}&compressMessageToEncrypt=true`;

        axios.post(tableListUpdateUrl)
          .then((response) => {
            if (response.data.broadcasted && response.data.broadcasted === true) {
              // console.log('Table list updated');
            } else if (response.data.errorDescription != null) {
              logger.info('There was an Error');
              logger.info(response.data);
              logger.error(`Error:${response.data.errorDescription}`);
              logger.error(response.data);
            } else {
              logger.info(response.data);
              logger.info(encryptedTableData);
            }
          })
          .catch((error) => {
            logger.info('There was an error in updating table list');
            logger.error(error);
            logger.info(encryptedTableData);
          });
      });

      eventEmitter.on('tableName_obtained', () => {
        if (self.tables.indexOf(tableName) >= 0 || tableList.indexOf(tableName) >= 0) {
          reject(`Error: Unable to save table. ${tableName} is already in the database`);
        } else {
          passphrase = self.generate_passphrase();

          self.createNewAddress(passphrase)
            .then((response) => {
              if (response.success === true && response.address && response.address.length > 0) {
                ({ address } = response);
                record = {
                  [tableName]: {
                    address,
                    passphrase,
                    public_key: response.public_key,
                  },
                };
                tableList.push(tableName);
                tableListRecord = {
                  tables: tableList,
                  date: Date.now(),
                };

                eventEmitter.emit('address_retrieved');
              } else {
                logger.error(response);
                reject('There was an error');
              }
            })
            .catch((error) => {
              logger.error(error);
              reject('Error creating Jupiter address for your table.');
            });
        }
      });

      eventEmitter.on('verified_balance', () => {
        if (appAccount === undefined || appAccount === '' || appAccount == null) {
          reject('Error: The .env file does not contain APP_ACCOUNT. Please provide one.');
        } else {
          self.loadAppData()
            .then(async (response) => {
              if (response.tables === undefined
                || response.tables == null
                || response.tables.length === 0) {
                tableList = [];
              } else {
                tableList = response.tables;
              }

              logger.info('You are about to create a new database table for your Gravity app.');
              logger.info('The following tables are already linked to your database:');
              logger.info(tableList);
              try {
                const answer = await self.makeQuestion('What will be the name of your new table?\n');
                tableName = answer;
                if (tableName === 'undefined' || tableName === undefined) {
                  reject('Table name cannot be undefined');
                } else {
                  eventEmitter.emit('tableName_obtained');
                }
              } catch (e) {
                reject(e);
              }
            })
            .catch((error) => {
              logger.error(error);
              reject('Error in creating table');
            });
        }
      });

      self.getBalance()
        .then((response) => {
          if (response.minimumAppBalance === true) {
            eventEmitter.emit('verified_balance');
          } else {
            logger.error('Error in creating new table: insufficient app balance.');
            logger.error(`A minimum of ${parseFloat((self.jupiter_data.minimumAppBalance) / (10 ** self.jupiter_data.moneyDecimals))} JUP is required to create a table with Gravity.`);
            eventEmitter.emit('insufficient_balance');
          }
        })
        .catch((error) => {
          logger.error('There was an error trying to create a new table in Jupiter.');
          logger.error(error);
          eventEmitter.emit('insufficient_balance');
        });
    });
  }

  // This class is meant to be used when creating tables from the command line
  createAppDatabase() {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    let appname;
    let server;
    let password;
    let passphrase;

    logger.info('You are about to create a Gravity app. Please answer the following questions:');

    rl.question('What is the name of the app?\n', (answer1) => {
      appname = answer1;

      rl.question('Please provide an encryption password for your Jupiter data:\n', (answer2) => {
        password = answer2;
        rl.question('What is the URL/IP of your Jupiter server? Do not use IP unless you also use the port!\n', (answer) => {
          server = answer;
          const currentData = {
            'Name of the app': appname,
            'Password for encryption': password,
            'Jupiter server': server,
          };
          logger.info('Please verify the data you entered:');
          logger.info(JSON.stringify(currentData));
          logger.info('');
          rl.question("You are about to create a Jupiter account which will hold your Gravity app's data. Is the information provided above accurate? If so, press ENTER. If not, press CTRL+C to cancel and rerun command.\n", () => {
            passphrase = methods.generate_passphrase();

            axios.get(`${server}/nxt?requestType=getAccountId&secretPhrase=${passphrase}`)
              .then((response) => {
                const address = response.data.accountRS;
                const { publicKey } = response.data;

                if (address) {
                  const configuration = {
                    APPNAME: appname,
                    JUPITERSERVER: server,
                    APP_ACCOUNT: passphrase,
                    APP_ACCOUNT_ADDRESS: address,
                    APP_PUBLIC_KEY: publicKey,
                    ENCRYPT_ALGORITHM: 'aes-256-cbc',
                    ENCRYPT_PASSWORD: password,
                    APP_ACCOUNT_ID: publicKey,
                  };
                  const envVariables = configuration;
                  let envVariablesInString = '';
                  envVariables.SESSION_SECRET = 'session_secret_key_here';

                  const fs = require('fs');
                  // We prepare the string that will be used to create the .env file
                  Object.keys(envVariables).forEach((key) => {
                    envVariablesInString = `${envVariablesInString + key.toUpperCase()}='${envVariables[key]}'\n`;
                  });

                  fs.writeFile('.env', envVariablesInString, (error) => {
                    if (error) {
                      return logger.error(error);
                    }
                    logger.info('\nSuccess! .env file generated!');
                    logger.info('\nPlease write down the 12-word passphrase and account address assigned to your app as well as the password assigned for encryption (See .env or .gravity.js files). If you lose your passphrase or your encryption password, you will lose access to all saved data.');
                    logger.info('\nIn order to begin saving information into the Jupiter blockchain, you will need to obtain Jupiter tokens from https://exchange.darcr.us.');
                    rl.close();
                    return null;
                  });
                } else {
                  logger.info(response.data.message);
                  rl.close();
                }
              })
              .catch((error) => {
                logger.error(error);
                logger.error('There was an error in database creation');
                rl.close();
              });
          });
        });
      });
    });
  }
}

const jupiterHost = process.env.JUPITER_SERVER;
const jupiterAPIService = new JupiterAPIService(jupiterHost, applicationAccountProperties)
module.exports = {
  gravity: new Gravity(jupiterAPIService)
};
