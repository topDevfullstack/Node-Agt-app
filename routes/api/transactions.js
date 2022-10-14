const express = require("express");
const bcrypt = require("bcryptjs");
const router = express.Router();
const keys = require("../../config/key");
const Transactions = require("../../models/transactions");
const PendingRequisition = require("../../models/PendingRequisition");
const SavedRequisition = require("../../models/SavedRequisition");
const OpenShipment = require("../../models/OpenShipment");
var jwt = require("jsonwebtoken");
const speakeasy = require("speakeasy");
var nodemailer = require("nodemailer");
const { json } = require("body-parser");
const managerEmail = "coolsariel0403@gmail.com";
const warehouseEmail = "zhak20220726@gmail.com";
var transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "juri.god0403@gmail.com",
    pass: "pfbfiriqcxsfthsx",
  },
});
var statusArray = ["pending", "saved", "open", "return", "reports"];

// @route   get api/transactions/test
// @desc    test User
// @access  Public
router.get("/test", (req, res) => {
  return res.json({ msg: "this is transactions api" });
});

// @route   get api/transactions/getalltransactions
// @desc    get all transactions
// @access  Public

router.get("/getalltransactions", async (req, res) => {
  const transaction_list = await Transactions.find({});
  const res_array = await makeTransactionArray(transaction_list);
  res.json(res_array);
});

const makeTransactionArray = async (transaction_list) => {
  const result_array = [];
  for (var i = 0; transaction_list[i]; i++) {
    var transaction = transaction_list[i];
    if (transaction.type == 0) {
      const transaction_res = await getTransactionChildFromPendingRequisition(
        transaction
      );
      result_array.push(transaction_res);
    } else if (transaction.type == 1) {
      const transaction_res = await getTransactionChildFromSavedRequisition(
        transaction
      );
      result_array.push(transaction_res);
    } else if (transaction.type == 2) {
      const transaction_res = await getTransactionChildFromOpenShipment(
        transaction
      );
      result_array.push(transaction_res);
    }
  }
  return result_array;
};

const getTransactionChildFromPendingRequisition = async (transaction) => {
  const pendingrequisition = await PendingRequisition.find({
    no: transaction.child_index,
  });
  const transaction_res = {
    transaction_number: transaction.no,
    status: statusArray[transaction.type],
    retailer: pendingrequisition[0].retailer,
    date: pendingrequisition[0].entry_date,
    child_transaction_number: pendingrequisition[0].no,
  };
  return transaction_res;
};

const getTransactionChildFromSavedRequisition = async (transaction) => {
  const savedrequisition = await SavedRequisition.find({
    no: transaction.child_index,
  });
  const transaction_res = {
    transaction_number: transaction.no,
    status: statusArray[transaction.type],
    retailer: savedrequisition[0].retailer,
    date: savedrequisition[0].entry_date,
    child_transaction_number: savedrequisition[0].no,
  };
  return transaction_res;
};

const getTransactionChildFromOpenShipment = async (transaction) => {
  const openshipment = await OpenShipment.find({
    no: transaction.child_index,
  });
  const transaction_res = {
    transaction_number: transaction.no,
    status: statusArray[transaction.type],
    retailer: openshipment[0].retailer,
    date: openshipment[0].entry_date,
    child_transaction_number: openshipment[0].no,
  };
  return transaction_res;
};

// @route   post api/transactions/newpendingrequisition
// @desc    add new transaction / pending requisition
// @access  Public
router.post("/newpendingrequisition", async (req, res) => {
  var entry_date = req.body.entry_date;
  var pickup_date = req.body.pickup_date;
  var retailer = req.body.retailer;
  var description = req.body.description;
  var items_qty = req.body.items_qty;
  var pending_requisition_no = await PendingRequisition.count();

  var newPendingRequisition = new PendingRequisition({
    no: pending_requisition_no,
    entry_date: entry_date,
    pickup_date: pickup_date,
    retailer: retailer,
    description: description,
    items_qty: items_qty,
  });

  newPendingRequisition.save();

  var transaction_no = await Transactions.count();
  var transaction_type = 0;
  var transaction_child_index = pending_requisition_no;
  var username = req.body.username;
  var email = req.body.email;

  var newTransaction = new Transactions({
    no: transaction_no,
    type: transaction_type,
    child_index: transaction_child_index,
    username: username,
    email: email,
  });
  newTransaction.save();

  sendEmailToManager(email);
  res.json({ msg: "success" });
});

// @route   get api/transactions/getpendingrequisition
// @desc    get transaction / pending requisition
// @access  Public
router.post("/getpendingrequisition", (req, res) => {
  var no = req.body.child_transaction_number;
  PendingRequisition.findOne({
    no: no,
  }).then((pending_requisition) => {
    res.json(pending_requisition);
  });
});

// @route   get api/transactions/getsavedrequisition
// @desc    get transaction / pending requisition
// @access  Public
router.post("/getsavedrequisition", (req, res) => {
  var no = req.body.child_transaction_number;
  SavedRequisition.findOne({
    no: no,
  }).then((saved_requisition) => {
    res.json(saved_requisition);
  });
});

// @route   post api/transactions/approvependingrequisition
// @desc    update transaction / approve pending requisition
// @access  Public
router.post("/approvependingrequisition", async (req, res) => {
  var no = req.body.child_transaction_number;

  await Transactions.findOneAndUpdate(
    { child_index: no, type: 0 },
    { type: -1 },
    {
      new: true,
    }
  );

  var entry_date = req.body.entry_date;
  var pickup_date = req.body.pickup_date;
  var retailer = req.body.retailer;
  var description = req.body.description;
  var items_qty = req.body.items_qty;
  var open_shipment_no = await OpenShipment.count();

  var newOpenShipment = new OpenShipment({
    no: open_shipment_no,
    entry_date: entry_date,
    pickup_date: pickup_date,
    retailer: retailer,
    description: description,
    items_qty: items_qty,
    requisition_number: no,
  });

  newOpenShipment.save();

  var transaction_no = await Transactions.count();
  var transaction_type = 2;
  var transaction_child_index = open_shipment_no;
  var username = req.body.username;
  var email = req.body.email;

  var newTransaction = new Transactions({
    no: transaction_no,
    type: transaction_type,
    child_index: transaction_child_index,
    username: username,
    email: email,
  });
  newTransaction.save();

  sendEmailToTechnician();
  sendEmailToTechnician(email);
  res.json({ msg: "success" });
});

// @route   post api/transactions/rejectpendingrequisition
// @desc    update transaction / reject pending requisition
// @access  Public
router.post("/rejectpendingrequisition", async (req, res) => {
  var no = req.body.child_transaction_number;

  await Transactions.findOneAndUpdate(
    { child_index: no, type: 0 },
    { type: -1 },
    {
      new: true,
    }
  );

  res.json({ msg: "success" });
});

// @route   post api/transactions/newsavedrequisition
// @desc    add new transaction / saved requisition
// @access  Public
router.post("/newsavedrequisition", async (req, res) => {
  var entry_date = req.body.entry_date;
  var pickup_date = req.body.pickup_date;
  var retailer = req.body.retailer;
  var description = req.body.description;
  var items_qty = req.body.items_qty;
  var saved_requisition_no = await SavedRequisition.count();

  var newSavedRequisition = new SavedRequisition({
    no: saved_requisition_no,
    entry_date: entry_date,
    pickup_date: pickup_date,
    retailer: retailer,
    description: description,
    items_qty: items_qty,
  });

  newSavedRequisition.save();

  var transaction_no = await Transactions.count();
  var transaction_type = 1;
  var transaction_child_index = saved_requisition_no;
  var username = req.body.username;
  var email = req.body.email;

  var newTransaction = new Transactions({
    no: transaction_no,
    type: transaction_type,
    child_index: transaction_child_index,
    username: username,
    email: email,
  });
  newTransaction.save();

  res.json({ msg: "success" });
});

// @route   post api/transactions/updatesavedrequisition
// @desc    update transaction / saved requisition
// @access  Public
router.post("/updatesavedrequisition", async (req, res) => {
  var pickup_date = req.body.pickup_date;
  var description = req.body.description;
  var items_qty = req.body.items_qty;
  var child_transaction_number = req.body.child_transaction_number;

  await SavedRequisition.findOneAndUpdate(
    { no: child_transaction_number },
    {
      pickup_date: pickup_date,
      description: description,
      items_qty: items_qty,
    },
    {
      new: true,
    }
  );

  res.json({ msg: "success" });
});

// @route   post api/transactions/submitsavedrequisition
// @desc    submit transaction / saved requisition
// @access  Public
router.post("/submitsavedrequisition", async (req, res) => {
  var entry_date = req.body.entry_date;
  var pickup_date = req.body.pickup_date;
  var retailer = req.body.retailer;
  var description = req.body.description;
  var items_qty = req.body.items_qty;
  var pending_requisition_no = await PendingRequisition.count();

  var newPendingRequisition = new PendingRequisition({
    no: pending_requisition_no,
    entry_date: entry_date,
    pickup_date: pickup_date,
    retailer: retailer,
    description: description,
    items_qty: items_qty,
  });

  newPendingRequisition.save();

  var child_index = req.body.child_transaction_number;
  console.log(child_index);
  await Transactions.findOneAndUpdate(
    { child_index: child_index, type: 1 },
    { type: 0, child_index: pending_requisition_no },
    {
      new: true,
    }
  );

  var email = req.body.email;
  sendEmailToManager(email);

  res.json({ msg: "success" });
});

// Send email To manager.
const sendEmailToManager = (technicianEmail) => {
  var mailOptions = {
    from: technicianEmail,
    to: managerEmail,
    subject: "New Requisition.",
    html: "<h1>New Requisition Submitted</h1><p>Please check it in your app.</p>",
  };

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error);
    } else {
      console.log("Email sent: " + info.response);
    }
  });
};

// Send email to Warehouse
const sendEmailToWarehouse = () => {
  var mailOptions = {
    from: managerEmail,
    to: warehouseEmail,
    subject: "New Shipment.",
    html: "<h1>New Shipment is open</h1><p>Please check it in your app.</p>",
  };

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error);
    } else {
      console.log("Email sent: " + info.response);
    }
  });
};

// Send email to Technician
const sendEmailToTechnician = (technicianEmail) => {
  var mailOptions = {
    from: managerEmail,
    to: technicianEmail,
    subject: "Requisition Accepted.",
    html: "<h1>Your requisition accepted.</h1><p>Please check it in your app.</p>",
  };

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error);
    } else {
      console.log("Email sent: " + info.response);
    }
  });
};

// @route   get api/transactions/getopenshipment
// @desc    get transaction / open shipment
// @access  Public
router.post("/getopenshipment", async (req, res) => {
  var no = req.body.child_transaction_number;
  OpenShipment.findOne({
    no: no,
  }).then((open_shipment) => {
    res.json(open_shipment);
  });
});

module.exports = router;
