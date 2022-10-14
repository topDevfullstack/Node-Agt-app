const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const OpenShipmentSchema = new Schema({
  no: {
    type: String,
  },
  entry_date: {
    type: String,
  },
  pickup_date: {
    type: String,
  },
  actualpickup_date: {
    type: String,
  },
  retailer: {
    type: String,
  },
  description: {
    type: String,
  },
  items_qty: {
    type: Object,
  },
  requisition_number: {
    type: String,
  },
  shipment_status: {
    type: String,
  },
  signature: {
    type: Object,
  },
});

module.exports = OpenShipment = mongoose.model(
  "openshipment",
  OpenShipmentSchema
);
