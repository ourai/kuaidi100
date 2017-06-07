const rp = require("request-promise");
const config = require("config");
const moment = require("moment");

const STATE_TEXT_MAP = {
    "0": "在途",  // 即货物处于运输过程中
    "1": "揽件",  // 货物已由快递公司揽收并且产生了第一条跟踪信息
    "2": "疑难",  // 货物寄送过程出了问题
    "3": "签收",  // 收件人已签收
    "4": "退签",  // 即货物由于用户拒签、超区等原因退回，而且发件人已经签收
    "5": "派件",  // 即快递正在进行同城派件
    "6": "退回"   // 货物正处于退回发件人的途中
  };
const STATUS_TEXT_MAP = {
    "0": "物流单暂无结果",
    "1": "查询成功",
    "2": "接口出现异常"
  };

function resolveCompanyResult( rawData ) {
  return rawData.map((company) => ({
      code: company.comCode,
      name: ""
    }));
}

function resolveLogisticsResult( rawData ) {
  let result = {
      receipt: rawData.nu,
      company: {
        code: rawData.com,
        name: "",
        contact: rawData.comcontact,
        url: rawData.comurl
      },
      stateCode: parseFloat(rawData.state, 10),
      state: STATE_TEXT_MAP[rawData.state],
      records: (rawData.data || []).map((r) => {
        r.time = moment(r.time).format();
        r.description = r.context;
        
        delete r.context;

        return r;
      })
    };

  return result;
}

module.exports = {
  /**
   * 根据快递单号获取关联公司
   */
  queryCompany: ( receipt ) => {
    return rp({
        uri: `https://www.kuaidi100.com/autonumber/auto`,
        qs: {
          num: receipt
        },
        json: true
      })
      .then((companies) => resolveCompanyResult(companies));
  },
  /**
   * 查询快递的在途信息
   */
  queryLogistics: ( params ) => {
    return rp({
        uri: `https://api.kuaidi100.com/api`,
        qs: {
          id: config.get("app.id"),
          com: params.company,
          nu: params.receipt
        },
        json: true
      })
      .then((logisticsInfo) => {
        if ( logisticsInfo.status === "1" ) {
          return resolveLogisticsResult(logisticsInfo);
        }
        else {
          throw new Error(STATUS_TEXT_MAP[logisticsInfo.status]);
        }
      });
  }
};
