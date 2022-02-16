import "./polyfills.mjs";
import express from "express";
import { Temporal } from "@js-temporal/polyfill";

// Refactor the following code to get rid of the legacy Date class.
// Use Temporal.PlainDate instead. See /test/date_conversion.spec.mjs for examples.

function createApp(database) {
  const app = express();

  app.put("/prices", (req, res) => {
    const liftPassCost = req.query.cost;
    const liftPassType = req.query.type;
    database.setBasePrice(liftPassType, liftPassCost);
    res.json();
  });

  app.get("/prices", (req, res) => {
    const age = req.query.age;
    const type = req.query.type;
    const baseCost = database.findBasePriceByType(type).cost;
    const date = parseDate(req.query.date);
    const newDate = parsePlainDate(req.query.date);
    const cost = calculateCost(age, type, date, baseCost, newDate);
    res.json({ cost });
  });

  function parseDate(dateString) {
    if (dateString) {
      return new Date(dateString);
    }
  }

  function parsePlainDate(dateString) { if(dateString) return Temporal.PlainDate.from(dateString); }

  function calculateCost(age, type, date, baseCost, newDate) {
    if (type === "night") {
      return calculateCostForNightTicket(age, baseCost);
    } else {
      return calculateCostForDayTicket(age, date, baseCost, newDate);
    }
  }

  function calculateCostForNightTicket(age, baseCost) {
    if (age === undefined) {
      return 0;
    }
    if (age < 6) {
      return 0;
    }
    if (age > 64) {
      return Math.ceil(baseCost * 0.4);
    }
    return baseCost;
  }

  function calculateCostForDayTicket(age, date, baseCost, newDate) {
    let reduction = calculateReduction(date, newDate);
    if (age === undefined) {
      return Math.ceil(baseCost * (1 - reduction / 100));
    }
    if (age < 6) {
      return 0;
    }
    if (age < 15) {
      return Math.ceil(baseCost * 0.7);
    }
    if (age > 64) {
      return Math.ceil(baseCost * 0.75 * (1 - reduction / 100));
    }
    return Math.ceil(baseCost * (1 - reduction / 100));
  }

  function calculateReduction(date, newDate) {
    let reduction = 0;
    if (date && isMonday(newDate) && !isHoliday(date, newDate)) {
      reduction = 35;
    }
    return reduction;
  }

  function isMonday(newDate) {
    return newDate.dayOfWeek === 1;
  }

  function isHoliday(date, newDate) {
    const holidays = database.getHolidays();
    for (let row of holidays) {
      let holiday = new Date(row.holiday);
      let newHoliday = Temporal.PlainDate.from(row.holiday);
      if (
        newDate &&
        newDate.year === newHoliday.year &&
        newDate.month === newHoliday.month &&
        newDate.day === newHoliday.day
      ) {
        return true;
      }
    }
    return false;
  }

  return app;
}

export { createApp };
