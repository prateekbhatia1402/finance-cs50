const User = require("../models/UserModel");
const Transaction = require("../models/TransactionModel");
const auth = require("./auth");
const Axios = require('axios');
const fin = Object();
const querystring = require('querystring');

fin.quote = async function (req, res) {
    try {
        const userid = auth.get_logged_in_user(req)
        // console.log('got quote request from ' + userid)
        if (userid === null) {
            return res.status(405).json({ error: "invalid user" })
        }
        const user = await User.findById(userid);
        if (user) {
            // console.log(req)
            let sid = req.body.sid || req.query.sid || req.params.sid;
            let share_data = await get_share_data(sid)
            if (!share_data) {
                return res.status(405).json({ error: "invalid stock" })
            }
            price = share_data[0]['price']
            stockname = share_data[0]['name']
            return res.status(200).json({ data: share_data[0] });
        }
        else {
            return res.status(405).json({ error: "invalid user" })
        }
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}

fin.quotes = async function (req, res) {
    try {
        const userid = auth.get_logged_in_user(req)
        // console.log('got quote request from ' + userid)
        if (userid === null) {
            return res.status(405).json({ error: "invalid user" })
        }
        const user = await User.findById(userid);
        if (user) {
            // console.log(req)
            let sids = req.body.sids || req.query.sids || req.params.sids;
            sids = JSON.parse(sids);
            let share_data = await get_share_data(sids)
            if (!share_data) {
                return res.status(405).json({ error: "invalid stock" })
            }
            return res.status(200).json({ data: share_data });
        }
        else {
            return res.status(405).json({ error: "invalid user" })
        }
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}


async function get_share_data(stock) {
    try {
        // console.log('got a request for', stock)
        const iek_key = process.env.TEST_IEX_KEY;
        const iex_url = process.env.TEST_IEX_URL;
        if (typeof '' === typeof stock) {
            const req_url = iex_url + '/stable/stock/' + querystring.escape(stock).toLowerCase()
                + '/quote?token=' + iek_key;
            let share_data = await Axios.get(req_url);
            share_data = share_data.data;
            // console.log('returning... ', { 'price': share_data['latestPrice'], 'name': share_data['companyName'] })
            return [{ 'price': share_data['latestPrice'], 'name': share_data['companyName'] }];
        }
        else {
            let response = []
            for (let stock_id of stock) {
                const req_url = iex_url + '/stable/stock/' + querystring.escape(stock_id).toLowerCase()
                    + '/quote?token=' + iek_key;
                let share_data = await Axios.get(req_url);
                share_data = share_data.data;
                response.push({ 'id': stock_id, 'price': share_data['latestPrice'], 'name': share_data['companyName'] })
                // console.log('got val: ', { 'id': stock_id, 'price': share_data['latestPrice'], 'name': share_data['companyName'] })
            }
            // console.log('returning ... ', response);
            return response;
        }
    }
    catch (err) {
        // console.log('something went wrong')
        // console.log(err);
        // console.log(err.message)
    }
    return null;
}



fin.get_data = async function (req, res) {
    try {
        const userid = auth.get_logged_in_user(req)
        if (!userid || userid === null) {
            return res.status(405).json({ error: "invalid user" })
        }
        const user = await User.findById(userid).populate("transactions");
        if (user) {
            return res.status(200).json({ data: user.toJSON() });
        }
        else {
            return res.status(405).json({ error: "invalid user" })
        }
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}

async function price_of_share(sid) {
    try {
        const price_data = await get_share_data(sid)
        if (!price_data)
            return null;
        if (price_data.length == 1)
            return price_data['price']
        else {
            let res = {}
            for (let value of price_data) {
                res[value['id']] = value['price']
            }
            return res;
        }
    }
    catch (err) {
        // console.log(err)
        // console.log('could not get price')

        return null
    }
}


fin.get_summary = async function (req, res) {
    try {
        // console.log('got a request for summary')
        const userid = auth.get_logged_in_user(req)
        if (!userid || userid === null) {
            return res.status(405).json({ error: "invalid user" })
        }
        const user = await User.findById(userid).populate({
            path: 'transactions',
            select: 'qty type stockname stockid -_id'
        });
        if (user) {
            // console.log('user is valid')
            let shares = user.transactions.reduce(
                function (a, b) {
                    let data;
                    if (a.has(b.stockid)) {
                        data = a.get(b.stockid)
                    }
                    else {
                        data = {
                            'id': b.stockid,
                            'name': b.stockname,
                            'qty': 0
                        };
                    }
                    // console.log('current data', data);
                    if (b.type === 'b') {
                        data['qty'] += b.qty
                    }
                    else {
                        data['qty'] -= b.qty
                    }
                    a.set(b.stockid, data)
                    return a;
                },
                new Map())

            let shares_total = 0
            let shares_data = []
            let stock_ids = shares.keys()
            let prices = await price_of_share(stock_ids);
            for (let entry of shares.entries()) {
                let key = entry[0]
                let value = entry[1]
                price = prices[key] || 0;
                value['price'] = price
                const amount = price * value['qty']
                shares_total += amount
                shares_data.push(value)
            }
            let summary = {
                'username': user.username,
                'total': user.cash + shares_total,
                'cash': user.cash,
                'shares': shares_data
            }
            return res.status(200).json({ data: summary });
        }
        else {
            return res.status(405).json({ error: "invalid user" })
        }
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}

fin.purchase = async function (req, res) {
    try {
        const userid = auth.get_logged_in_user(req)
        if (userid === null) {
            return res.status(405).json({ error: "invalid user" })
        }
        const user = await User.findById(userid);
        if (user) {
            let { stockid, stockname, qty } = req.body;
            let share_data = await get_share_data(stockid)
            if (!share_data) {
                return res.status(405).json({ error: "invalid stock" })
            }
            let price = share_data[0]['price']
            if (!price || price <= 0) {
                return res.status(405).json({ error: "price info not available" })
            }
            stockname = share_data[0]['name']
            // console.log(`stockname: ${stockname} , price: ${price}, qty: ${qty}, cost: ${price * qty}, funds:${user.cash}`)
            if (price * qty > user.cash)
                return res.status(405).json({ error: "insufficient funds" })
            const trans = new Transaction({
                stockid: stockid.toLowerCase(),
                stockname: stockname,
                price: price,
                type: 'b',
                qty: qty
            });
            const savedTrans = await trans.save();
            user.cash -= (price * qty);
            user.transactions.push(savedTrans._id);
            user.save();
            return res.status(201).json({ msg: "purchased successfully", data: savedTrans.toJSON() });
        }
        else {
            return res.status(405).json({ error: "invalid user" })
        }
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}


fin.sell = async function (req, res) {
    try {
        const userid = auth.get_logged_in_user(req)
        if (userid === null) {
            return res.status(405).json({ error: "invalid user" })
        }
        let { stockid, qty } = req.body;
        stockid = stockid.toLowerCase();
        let share_data = await get_share_data(stockid)
        if (!share_data) {
            return res.status(405).json({ error: "invalid stock" })
        }
        let price = share_data[0]['price'];
        if (!price || price <= 0) {
            return res.status(405).json({ error: "price info not available" })
        }
        let stockname = share_data[0]['name']
        let user = await User.findById(userid).populate({
            path: 'transactions',
            match: { stockid: stockid }, select: 'qty type -_id'
        });
        if (user) {
            // console.log(user.transactions)
            let cqty = user.transactions.reduce(
                function (a, b) {
                    if (b.type === 'b')
                        return a + b.qty;
                    else
                        return a - b.qty;
                },
                0)
            // console.log('cqty', cqty)
            if (qty > cqty)
                return res.status(405).json({ error: "insufficient shares" })
            const trans = new Transaction({
                stockid: stockid,
                stockname: stockname,
                price: price,
                type: 's',
                qty: qty
            });
            const savedTrans = await trans.save();
            user.cash += (price * qty);
            user.transactions.push(savedTrans._id);
            user.save();
            return res.status(201).json({ msg: "sold successfully", data: savedTrans.toJSON() });
        }
        else {
            return res.status(405).json({ error: "invalid user" })
        }
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}

module.exports = fin;