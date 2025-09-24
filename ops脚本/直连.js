/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 */
define(['N/search', 'N/record', 'N/task', 'N/runtime', './jsonTxml', 'N/http', 'N/https','N/encode'], function (search, record, task, runtime, util, http, https,encode) {

    function execute(context) {
        // search
       const datalist = [];
       var limit=4000;
       var mySearch = search.load({
            id:"customsearch2058"
       })

       var HONGKONG_BankList = {}
       var BankSearch = search.create({
          type: "customrecord649",
          columns: ["custrecord1546","custrecord1547"]
       })
       BankSearch.run().each(function(result){
          HONGKONG_BankList[result.getValue({name: 'custrecord1547'})] = result.getValue({name: 'custrecord1546'})
          return true;
       })

		var dataList = [];
		// 遍历搜索结果 每次取1000个，避免结果超过4000时报错
		var searchResult = mySearch.run();
		var searchIndex = 0;
		do {
		var resultSlice = searchResult.getRange({start:searchIndex,end:searchIndex + 1000});
		resultSlice.forEach(function(rec) {
			rec = JSON.parse(JSON.stringify(rec));
			//log.debug('rec',rec);
            var createDate = rec.values.datecreated.replace('上午', '').replace('下午', '');
            //log.debug('格式化前:', createDate);
            createDate = formatDate(createDate);
            //log.debug('格式化后:', createDate);
            var internalid = rec.values.internalid[0].value;
            var pmtDates = formatDate2(rec.values.formuladate);
            var payName = rec.values.entity[0].text
            var legalName =rec.values['vendor.legalname']
            legalName = convertChinesePunctuationToEnglish(legalName)
            payName =convertChinesePunctuationToEnglish(payName);
            var payCode = rec.values['vendor.custentity13'];
            var payBankName = rec.values['vendor.custentity14'];
            var payBanSc = rec.values['vendor.custentity15'];
            var payCity = rec.values['vendor.custentity20'];
            var payCountry =rec.values['vendor.shipcountrycode']
            var payAddress1 = rec.values['vendor.custentity18'];
            var payAddress2 = rec.values['vendor.custentity19'];
            var pmtAccId = rec.values.custbody110[0].text;
            var tranid = rec.values.tranid
            payAddress1 = convertChinesePunctuationToEnglish(payAddress1)
            payAddress2 = convertChinesePunctuationToEnglish(payAddress2)
            if(containsInvalidCharacters(payAddress1)){
              var mes =  "payAddress1存在不允许的字符,支票号："+tranid
              log.error("存在不允许的字符","存在不允许的字符")
               chatMes(mes)
               return;
            }else if(containsInvalidCharacters(payAddress2)){
                var mes =  "payAddress2存在不允许的字符,支票号："+tranid
                log.error("存在不允许的字符","存在不允许的字符")
                chatMes(mes)
                return;
            }else if(containsInvalidCharacters(legalName)){
                var mes =  "legalName存在不允许的字符,支票号："+tranid
                log.error("存在不允许的字符","存在不允许的字符")
                chatMes(mes)
                return;
            }else if(containsInvalidCharacters(payBankName)){
                var mes =  "payBankName存在不允许的字符,支票号："+tranid
                log.error("存在不允许的字符","存在不允许的字符")
                chatMes(mes)
                return;
            }else if(containsInvalidCharacters(payCode)){
                var mes =  "payCode存在不允许的字符,支票号："+tranid
                log.error("存在不允许的字符","存在不允许的字符")
                chatMes(mes)
                return;
            }else if(containsInvalidCharacters(payCity)){
                var mes =  "payCity存在不允许的字符,支票号："+tranid
                log.error("存在不允许的字符","存在不允许的字符")
                chatMes(mes)
                return;
            }else if(containsInvalidCharacters(payCountry)){
                var mes =  "payCountry存在不允许的字符,支票号："+tranid
                log.error("存在不允许的字符","存在不允许的字符")
                chatMes(mes)
                return;
            }else if(containsInvalidCharacters(payCode)){
                var mes =  "payCode存在不允许的字符,支票号："+tranid
                log.error("存在不允许的字符","存在不允许的字符")
                chatMes(mes)
                return;
            }else if(containsInvalidCharacters(payBanSc)){
                var mes =  "payBanSc存在不允许的字符,支票号："+tranid
                log.error("存在不允许的字符","存在不允许的字符")
                chatMes(mes)
                return;
            }
            // return;
            var add1List = splitString(payAddress1);
//          log.debug("add1List",add1List)


//            var type = rec.values.recordtype
            if (!payCode || !payBankName || !payBanSc || !payCity || !payCountry || !payAddress1 || !payAddress2) {
                log.debug('There is an empty field in the pay data, skipping this record.');
                var mes = '账单信息缺失，停止推送'+tranid
                 chatMes(mes)
                return;
            }
            if(pmtAccId == "6300170088"&&payCountry=="HK"){//香港账户之间进行交易需要在 收款账户前加上银行代码
                if(HONGKONG_BankList[payBankName.toUpperCase()]){
                     var threeCode = payCode.substring(0,3)
                     if(threeCode!=HONGKONG_BankList[payBankName.toUpperCase()]){
                        payCode = HONGKONG_BankList[payBankName.toUpperCase()]+payCode;
                     }
                }else{
                  var mes = '香港之间交易，未匹配到银行代码，停止推送'+tranid
                  chatMes(mes)
                  return;
                }
            }
          var pmtAnPayId = internalid+''+tranid;
            datalist.push(
                    {
                        pmtId: rec.values.tranid,//付款编号
                        payName: legalName,//收款人姓名（英文）
                        payCode: payCode,//收款人银行账号
                        payBankName: rec.values['vendor.custentity14'],//收款人银行名称(英文）
                        payBanSc: rec.values['vendor.custentity15'],//收款人银行SWIFT CODE
                        pmtMemo: rec.values.custbody107,//付款摘要
                        pmtDate: pmtDates,//付款日期
                        //pmtCompanyName: rec.values.subsidiary[0].text.split(":")[1],//付款公司名称（英文）
                        pmtCompanyName: 'HONGKONG HIOTEC SOLUTIONS CO.,LIMITED',//付款公司名称（英文）香港恒藝騰信息科技有限公司
                        pmtAmount : rec.values.formulacurrency,//付款金额
                        currency: rec.values.currency[0].text,//币种
                        pmtBanSc:rec.values.formulatext,//付款人银行SWIFI CODE
                        pmtAnPayId:pmtAnPayId,//内部 ID
                        internalid:internalid,
                        creDtTm: createDate,//创建日期
                        pmtName:rec.values.custbody109[0].text,//付款人名称
                        payCity:rec.values['vendor.custentity20'],//收款人城市
                        payCountry:rec.values['vendor.shipcountrycode'],//收款人国家
                        payAddress1:add1List,//收款人地址一
                        payAddress2:rec.values['vendor.custentity19'],//收款人地址二
                        pmtAccId:rec.values.custbody110[0].text,//付款账户号码
                        pmtAccCy:rec.values.custbody111[0].text,//付款账户币种
                        recordType:rec.values.recordtype,//记录类型
//                        PstCd:PstCd,
                        payMmbId:rec.values['vendor.custentity6'],
                        payType:rec.values.custbody154,
                        subsidiary:rec.values.subsidiary
                    });
			searchIndex ++;
			}
		);
		} while (resultSlice.length >= 1000);
        //付款信息转成XML
           const pmtList = [];
           datalist.forEach(function(rec) {
           //log.debug('数据：',rec);
        //    rec.creDtTm = formatDateToISO(rec.creDtTm);
        //    log.debug("日期转换后：",rec.creDtTm);
            var json = create_json(rec)


        for(var i=0;i<rec.payAddress1.length;i++){
            json.Document.CstmrCdtTrfInitn.PmtInf.CdtTrfTxInf.Cdtr.PstlAdr.AdrLine.push(rec.payAddress1[i]);
        }

        var result = json2xml(json);
        result = result.replace('<root>','');
        result = result.replace('</root>','');
        log.debug('转换结果:', result);

        var formData = {
            content: result
        }

       var encodedData = Object.keys(formData)
           .map(function (key) {
               return encodeURIComponent(key) + '=' + encodeURIComponent(formData[key]);
           })
           .join('&');
       var headers = {
                       'Content-Type': 'application/x-www-form-urlencoded'
                   }
        var response = http.post({
            url: 'http://120.26.166.19:8902/jpm/file/signAndUpload',
            body: encodedData,
            headers: headers
        });
        log.debug("response",response)
         var appBody = response.body
        if(response.code == 200){

            record.submitFields({
                type:rec.recordType,
                id: rec.internalid,
                values:{
                'custbody145':true
                }
            });
        }else{
           chatMes('xml推送接口返回失败,code:',response.code)
        }
       })



        // http https
    }

    function chatMes (mes) {
        var payload ={
            "msgtype": "text",
            "text": {
            "content": mes,
            "mentioned_list":["yehantao"],
            "mentioned_mobile_list":["18058170845"]
            }
        }
        var payload_json = JSON.stringify(payload)
        var response = https.post({
             url: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=ec253e99-d495-4cc4-b4f5-c9aafe5ce77f',
             body: payload_json
        });
    }

    function json2xml(json) {
        var xotree = new XML.ObjTree();
        var xmlText = xotree.writeXML(json)
        //var xmlText = xotree.writeXML(JSON.parse(json))
        return xmlText;
    }


    function formatDate(inputDate) {
        // 将输入的日期字符串解析为 Date 对象
        var date = new Date(inputDate);
        // 获取日期的各个部分
        var year = date.getFullYear();
        var month = ("0" + (date.getMonth() + 1)).slice(-2);
        var day = ("0" + date.getDate()).slice(-2)
        var hours = ("0" + date.getHours()).slice(-2)
        var minutes = ("0" + date.getMinutes()).slice(-2)
        var seconds = ("0" + date.getSeconds()).slice(-2)
        // 格式化日期字符串
        var formattedDate = year + '-' + month + '-' + day + 'T' + hours + ':' + minutes + ':' + seconds;
        return formattedDate;
    }
        function formatDate2(inputDate) {
        // 将输入的日期字符串解析为 Date 对象
        var date = new Date(inputDate);
        // 获取日期的各个部分
        var year = date.getFullYear();
        var month = ("0" + (date.getMonth() + 1)).slice(-2);
        var day = ("0" + date.getDate()).slice(-2)
        // 格式化日期字符串
        var formattedDate = year + '-' + month + '-' + day;
        return formattedDate;
    }
    function containsInvalidCharacters(str) {
    // 匹配任何不是字母、数字、以及特定符号的字符
      const regex = /[^a-zA-Z0-9\/\-\?:\(\)\.,'\+ ]/;
      return regex.test(str);
    }

    function convertChinesePunctuationToEnglish(str) {
      // 创建一个映射，将中文符号替换为英文符号
      const punctuationMap = {
        '，': ',',
        '。': '.',
        '：': ':',
        '；': ';',
        '！': '!',
        '？': '?',
        '“': '"',
        '”': '"',
        '（': '(',
        '）': ')',
        '【': '[',
        '】': ']',
        '——': '--',
        '、': ','
      };
     for (var chineseChar in punctuationMap) {
        var regex = new RegExp(chineseChar,'g');
        str = str.replace(regex, punctuationMap[chineseChar]);
    }
      // 使用正则表达式进行替换
      return str
    }


    function splitString(str) {//分割字符串
      // 如果字符串长度小于或等于 70，直接返回
      if (str.length < 70) {
        return [str];
      }

      // 查找最近的空格或逗号位置
      const spaceIndex = str.lastIndexOf(' ',69);
      const commaIndex = str.lastIndexOf(',',69);

      // 确定分割点，选择空格或逗号位置，优先选择空格
      const splitIndex = spaceIndex > commaIndex ? spaceIndex : commaIndex;

      // 如果没有找到合适的分割点，直接在 70 位置分割
      const splitPosition = splitIndex !== -1 ? splitIndex : 69;

      // 分割字符串并返回结果
      const part1 = str.substring(0, splitPosition).trim();
      const part2 = str.substring(splitPosition).trim();
      var arr1 = [part1]
      var arr = [part2]
      if(part2.length >= 70){
        arr = splitString(part2)
      }

      var newArr = arr1.concat(arr)
      return newArr;
    }

    function create_json(rec) {
        var subsidiary = rec.subsidiary[0].value
        log.debug("rec.subsidiary",rec.subsidiary)
        if(subsidiary==15) {
            var json = {
                "Document": {
                    "-xmlns": "urn:iso:std:iso:20022:tech:xsd:pain.001.001.03",
                    "-xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
                    "CstmrCdtTrfInitn": {
                        "GrpHdr": {
                            "MsgId": rec.pmtAnPayId+ "5",
                            "CreDtTm": rec.creDtTm,
                            "NbOfTxs": "1",
                            "CtrlSum": rec.pmtAmount,
                            "InitgPty": {
                                "Nm": rec.pmtCompanyName
                            }
                        },
                        "PmtInf": {
                            "PmtInfId": rec.pmtAnPayId + "5",
                            "PmtMtd": "TRF",
                            "NbOfTxs": "1",
                            "CtrlSum": rec.pmtAmount,
                            "PmtTpInf": {
                                "SvcLvl": {
                                    "Cd": "URGP"
                                }
                            },
                            "ReqdExctnDt": rec.pmtDate,
                            "Dbtr": {
                                "Nm": rec.pmtName,
                                "PstlAdr": {
                                    "Ctry": "HK"
                                }
                            },
                            "DbtrAcct": {
                                "Id": {
                                    "Othr": {
                                        "Id": rec.pmtAccId
                                    }
                                },
                                "Ccy": rec.pmtAccCy
                            },
                            "DbtrAgt": {
                                "FinInstnId": {
                                    "BIC": rec.pmtBanSc,
                                    "PstlAdr": {
                                        "Ctry": "HK"
                                    }
                                }
                            },
                            "ChrgBr": "SHAR",
                            "CdtTrfTxInf": {
                                "PmtId": {
                                    "InstrId": rec.pmtId,
                                    "EndToEndId": rec.pmtId
                                },
                                "Amt": {
                                    "InstdAmt": {
                                        "-Ccy": rec.currency,
                                        "#text": rec.pmtAmount
                                    }
                                },
                                "CdtrAgt": {
                                    "FinInstnId": {
                                        "BIC": rec.payBanSc,
                                        "Nm": rec.payBankName,
                                        "PstlAdr": {
                                            "Ctry": rec.payCountry
                                        }
                                    }
                                },
                                "Cdtr": {
                                    "Nm": rec.payName,
                                    "PstlAdr": {
                                        "TwnNm": rec.payCity,
                                        "Ctry": rec.payCountry,
                                        "AdrLine": []
                                    }
                                },
                                "CdtrAcct": {
                                    "Id": {
                                        "Othr": {
                                            "Id": rec.payCode
                                        }
                                    }
                                },
                                "RmtInf": {
                                    "Ustrd": 'Payment'//rec.pmtMemo
                                }
                            }
                        }
                    }
                }
            };
        }else {
            if (!rec.payType) {
                mes = "未选择付款方式"
                return
            } else {
                rec.payType = rec.payType[0].value
                log.debug("付款方式：", rec.payType)
            }
            if (rec.payType == '1') {//境内ACH
                var json = {
                    "Document": {
                        "-xmlns": "urn:iso:std:iso:20022:tech:xsd:pain.001.001.03",
                        "-xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
                        "-xsi:schemaLocation": "urn:iso:std:iso:20022:tech:xsd:pain.001.001.03 file:///H:/schema/pain.001.001.03.xsd",
                        "CstmrCdtTrfInitn": {
                            "GrpHdr": {
                                "MsgId": rec.pmtAnPayId + "2",
                                "CreDtTm": rec.creDtTm,
                                "NbOfTxs": "1",//传输份数
                                "CtrlSum": rec.pmtAmount,
                                "InitgPty": {
                                    "Nm": rec.pmtName
                                }
                            },
                            "PmtInf": {
                                "PmtInfId": rec.pmtAnPayId + "1",
                                "PmtMtd": "TRF",
                                "NbOfTxs": "1",//传输份数
                                "CtrlSum": rec.pmtAmount,
                                "PmtTpInf": {
                                    "SvcLvl": {
                                        "Cd": "NURG"//美国境内ACH
                                    },
                                    "LclInstrm": {
                                        "Cd": "CCD"//美国境内ACH
                                    }
                                },
                                "ReqdExctnDt": rec.pmtDate,
                                "Dbtr": {
                                    "Nm": rec.pmtName,
                                    "PstlAdr": {
                                        "Ctry": "US"
                                    },
                                    "Id": {
                                        "OrgId": {
                                            "Othr": {
                                                "Id": "3489266227", //固定一下，摩根银行有对应的ID在邮件里
                                                "SchmeNm": {
                                                    "Prtry": "JPMCOID"
                                                }
                                            }
                                        }
                                    }
                                },
                                "DbtrAcct": {
                                    "Id": {
                                        "Othr": {
                                            "Id": rec.pmtAccId
                                        }
                                    },
                                    "Ccy": rec.pmtAccCy
                                },
                                "DbtrAgt": {
                                    "FinInstnId": {
                                        "ClrSysMmbId": {
                                            "MmbId": "021000021"
                                        },
                                        "PstlAdr": {
                                            "Ctry": "US"
                                        }
                                    }
                                },
//                    "ChrgBr": "SHAR",
                                "CdtTrfTxInf": {
                                    "PmtId": {
                                        "InstrId": rec.pmtId + "1",
                                        "EndToEndId": rec.pmtId + "1"
                                    },
                                    "Amt": {
                                        "InstdAmt": {
                                            "-Ccy": rec.currency,
                                            "#text": rec.pmtAmount
                                        }
                                    },
                                    "CdtrAgt": {
                                        "FinInstnId": {
                                            "ClrSysMmbId": {
                                                "MmbId": rec.payMmbId
                                            },
                                            "Nm": rec.payBankName,
                                            "PstlAdr": {
                                                "TwnNm": rec.payCity,
                                                "CtrySubDvsn": rec.payCity,
                                                "Ctry": rec.payCountry
                                            }
                                        }
                                    },
                                    "Cdtr": {
                                        "Nm": rec.payName,
                                        "PstlAdr": {
                                            "Ctry": rec.payCountry,
                                            "AdrLine": []
                                        }
                                    },
                                    "CdtrAcct": {
                                        "Id": {
                                            "Othr": {
                                                "Id": rec.payCode
                                            }
                                        },
                                        "Tp": {
                                            "Cd": "CASH"//美国境内ACH
                                        }
                                    }
                                }
                            }
                        }
                    }
                };

            } else if (rec.payType == '2') {//境内CHIPS
                var json = {
                    "Document": {
                        "-xmlns": "urn:iso:std:iso:20022:tech:xsd:pain.001.001.03",
                        "-xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
                        "-xsi:schemaLocation": "urn:iso:std:iso:20022:tech:xsd:pain.001.001.03 file:///H:/schema/pain.001.001.03.xsd",
                        "CstmrCdtTrfInitn": {
                            "GrpHdr": {
                                "MsgId": rec.pmtAnPayId + "3",
                                "CreDtTm": rec.creDtTm,
                                "NbOfTxs": "1",//传输份数
                                "CtrlSum": rec.pmtAmount,
                                "InitgPty": {
                                    "Nm": rec.pmtName
                                }
                            },
                            "PmtInf": {
                                "PmtInfId": rec.pmtAnPayId + "2",
                                "PmtMtd": "TRF",
                                "NbOfTxs": "1",//传输份数
                                "CtrlSum": rec.pmtAmount,
                                "PmtTpInf": {
                                    "SvcLvl": {
                                        "Cd": "URGP"//美国境内ACH
                                    }
                                },
                                "ReqdExctnDt": rec.pmtDate,
                                "Dbtr": {
                                    "Nm": rec.pmtName,
                                    "PstlAdr": {
                                        "Ctry": "US"
                                    }
                                },
                                "DbtrAcct": {
                                    "Id": {
                                        "Othr": {
                                            "Id": rec.pmtAccId
                                        }
                                    },
                                    "Ccy": rec.pmtAccCy
                                },
                                "DbtrAgt": {
                                    "FinInstnId": {
                                        "BIC": rec.pmtBanSc,
                                        "PstlAdr": {
                                            "Ctry": "US"
                                        }
                                    }
                                },
//                    "ChrgBr": "SHAR",
                                "CdtTrfTxInf": {
                                    "PmtId": {
                                        "InstrId": rec.pmtId + "2",
                                        "EndToEndId": rec.pmtId + "2"
                                    },
                                    "Amt": {
                                        "InstdAmt": {
                                            "-Ccy": rec.currency,
                                            "#text": rec.pmtAmount
                                        }
                                    },
                                    "CdtrAgt": {
                                        "FinInstnId": {
                                            "BIC": rec.payBanSc,
//                          "ClrSysMmbId":{
//                              "ClrSysId":{
//                                "Cd":"USPID"
//                              }
////                              "MmbId":rec.payMmbId
//                          },
                                            "Nm": rec.payBankName,
                                            "PstlAdr": {
                                                "Ctry": rec.payCountry
                                            }
                                        }
                                    },
                                    "Cdtr": {
                                        "Nm": rec.payName,
                                        "PstlAdr": {
//                          "PstCd":rec.PstCd,
//                          "TwnNm": rec.payCity,
//                          "CtrySubDvsn":rec.payCity,
                                            "Ctry": rec.payCountry,
                                            "AdrLine": []
                                        }
                                    },
                                    "CdtrAcct": {
                                        "Id": {
                                            "Othr": {
                                                "Id": rec.payCode
                                            }
                                        }
                                    },
                                    "RmtInf": {
                                        "Ustrd": rec.pmtMemo
                                    }
                                }
                            }
                        }
                    }
                };
            } else if (rec.payType == '3') {//境外AUTOFX
                var json = {
                    "Document": {
                        "-xmlns": "urn:iso:std:iso:20022:tech:xsd:pain.001.001.03",
                        "-xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
                        "CstmrCdtTrfInitn": {
                            "GrpHdr": {
                                "MsgId": rec.pmtAnPayId + '3',
                                "CreDtTm": rec.creDtTm,
                                "NbOfTxs": "1",
                                "CtrlSum": rec.pmtAmount,
                                "InitgPty": {
                                    "Nm": rec.pmtName
                                }
                            },
                            "PmtInf": {
                                "PmtInfId": rec.pmtAnPayId + "3",
                                "PmtMtd": "TRF",
                                "NbOfTxs": "1",
                                "CtrlSum": rec.pmtAmount,
                                "ReqdExctnDt": rec.pmtDate,
                                "Dbtr": {
                                    "Nm": rec.pmtName,
                                    "PstlAdr": {
                                        "Ctry": "US"
                                    }
                                },
                                "DbtrAcct": {
                                    "Id": {
                                        "Othr": {
                                            "Id": rec.pmtAccId
                                        }
                                    },
                                    "Ccy": rec.pmtAccCy
                                },
                                "DbtrAgt": {
                                    "FinInstnId": {
                                        "BIC": rec.pmtBanSc,
                                        "ClrSysMmbId": {
                                            "MmbId": "021000021"
                                        },
                                        "PstlAdr": {
                                            "Ctry": "US"
                                        }
                                    }
                                },

//                    "ChrgBr": "SHAR",
                                "CdtTrfTxInf": {
                                    "PmtId": {
//                        "InstrId": rec.pmtId,
                                        "EndToEndId": rec.pmtId+ "3"
                                    },
                                    "PmtTpInf": {
                                        "SvcLvl": {
                                            "Cd": "URGP"
                                        }
                                    },
                                    "Amt": {
                                        "InstdAmt": {
                                            "-Ccy": rec.currency,
                                            "#text": rec.pmtAmount
                                        }
                                    },
                                    "CdtrAgt": {
                                        "FinInstnId": {
                                            "BIC": rec.payBanSc,
//                          "ClrSysMmbId":{
//                              "MmbId":rec.payMmbId  //暂时固定
//                          },
                                            "Nm": rec.payBankName,
                                            "PstlAdr": {
                                                "Ctry": rec.payCountry
                                            }
                                        }
                                    },
                                    "Cdtr": {
                                        "Nm": rec.payName,
                                        "PstlAdr": {
//                          "StrtNm": [],
//                          "PstCd":rec.PstCd,
                                            "TwnNm": rec.payCity,
                                            "Ctry": rec.payCountry,
                                            "AdrLine": []
                                        }
                                    },
                                    "CdtrAcct": {
                                        "Id": {
                                            "Othr": {
                                                "Id": rec.payCode
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                };
            } else if (rec.payType == '4') {
                var json = {
                    "Document": {
                        "-xmlns": "urn:iso:std:iso:20022:tech:xsd:pain.001.001.03",
                        "-xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
//                "-xsi:schemaLocation":"urn:iso:std:iso:20022:tech:xsd:pain.001.001.03 file:///H:/schema/pain.001.001.03.xsd",
                        "CstmrCdtTrfInitn": {
                            "GrpHdr": {
                                "MsgId": rec.pmtAnPayId + "1",
                                "CreDtTm": rec.creDtTm,
                                "NbOfTxs": "1",
                                "CtrlSum": rec.pmtAmount,
                                "InitgPty": {
                                    "Nm": rec.pmtName
                                }
                            },
                            "PmtInf": {
                                "PmtInfId": rec.pmtAnPayId + "4",
                                "PmtMtd": "TRF",
                                "NbOfTxs": "1",
                                "CtrlSum": rec.pmtAmount,
                                "PmtTpInf": {
                                    "SvcLvl": {
                                        "Cd": "URGP"
                                    }
                                },
                                "ReqdExctnDt": rec.pmtDate,
                                "Dbtr": {
                                    "Nm": rec.pmtName,
                                    "PstlAdr": {
                                        "Ctry": "US"
                                    }
                                },
                                "DbtrAcct": {
                                    "Id": {
                                        "Othr": {
                                            "Id": rec.pmtAccId
                                        }
                                    },
                                    "Ccy": rec.pmtAccCy
                                },
                                "DbtrAgt": {
                                    "FinInstnId": {
                                        "BIC": rec.pmtBanSc,
                                        "PstlAdr": {
                                            "Ctry": "US"
                                        }
                                    }
                                },
//                    "ChrgBr": "SHAR",
                                "CdtTrfTxInf": {
                                    "PmtId": {
                                        "InstrId": rec.pmtId+ "4",
                                        "EndToEndId": rec.pmtId+ "4"
                                    },
                                    "Amt": {
                                        "InstdAmt": {
                                            "-Ccy": rec.currency,
                                            "#text": rec.pmtAmount
                                        }
                                    },
                                    "CdtrAgt": {
                                        "FinInstnId": {
                                            "ClrSysMmbId": {
                                                "MmbId": rec.payMmbId
                                            },
//                          "Nm": rec.payBankName,
                                            "PstlAdr": {
                                                "Ctry": rec.payCountry
                                            }
                                        }
                                    },
                                    "Cdtr": {
                                        "Nm": rec.payName,
                                        "PstlAdr": {
//                          "PstCd":rec.PstCd,
//                          "TwnNm": rec.payCity,
//                          "CtrySubDvsn":rec.payCity,
                                            "Ctry": rec.payCountry,
                                            "AdrLine": []
                                        }
                                    },
                                    "CdtrAcct": {
                                        "Id": {
                                            "Othr": {
                                                "Id": rec.payCode
                                            }
                                        }
                                    },
                                    "RmtInf": {
                                        "Ustrd": rec.pmtMemo
                                    }
                                }
                            }
                        }
                    }
                };
            }
        }
        return json;
    }

    return {
        execute: execute
    };
});