// Copyright (C) 2008 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

var time = require('calendar');
var assert = require('test/assert');

var register = function (name, block) {
    exports[name] = block;
};

register('testParseIcal', function testParseIcal() {
  assert.eq(
      '20061125', time.date(2006, 11, 25), time.parseIcal('20061125'));
  assert.eq(
      '19001125', time.date(1900, 11, 25), time.parseIcal('19001125'));
  assert.eq(
      '19000228', time.date(1900, 2, 28), time.parseIcal('19000228'));
  assert.eq(
      '20061125T110000', time.dateTime(2006, 11, 25, 11, 0, 0),
      time.parseIcal('20061125T110000'));
  assert.eq(
      '20061125T113000', time.dateTime(2006, 11, 25, 11, 30, 0),
      time.parseIcal('20061125T113000'));
  assert.eq(
      '20061125T000000', time.dateTime(2006, 11, 25, 0, 0, 0),
      time.parseIcal('20061125T000000'));
  // 2400 -> next day
  assert.eq(
      '20061125T240000', time.dateTime(2006, 11, 26, 0, 0, 0),
      time.parseIcal('20061125T240000'));

  // test bad strings
  var badStrings = ['20060101T', 'foo', '', '123', '1234',
                    'D123456', 'P1D', '20060102/20060103',
                    null, undefined, '20060101T12',
                    '20060101TT120', '2006Ja01' ];
  for (var i = 0; i < badStrings.length; ++i) {
    try {
      time.parseIcal(badStrings[i]);
      fail('time.parseIcal did not fail on bad ical ' + badStrings[i]);
    } catch (e) {
      // pass
    }
  }
});

register('testDate', function testDate() {
  assert.eq(time.date(2006, 1, 1), time.date(2006, 1, 1));
  assert.lt(time.date(2006, 1, 1), time.date(2006, 1, 2));
  assert.lt(time.date(2006, 1, 1), time.date(2006, 2, 1));
  assert.lt(time.date(2006, 1, 3), time.date(2006, 2, 1));
  assert.lt(time.date(2005, 12, 31), time.date(2006, 1, 1));
  assert.eq(time.date(1, 1, 1), time.date(1, 1, 1));
  assert.lt(time.date(1, 1, 1), time.date(1, 1, 2));
  assert.lt(time.date(1, 1, 1), time.date(2006, 1, 1));
  assert.lt(time.date(1, 1, 1), time.date(1, 2, 1));
  assert.lt(time.date(0, 12, 31), time.date(1, 1, 1));
  assert.lt(time.MIN_DATE_VALUE, time.MAX_DATE_VALUE);
});

register('testDateTime', function testDateTime() {
  assert.eq(
      time.dateTime(2006, 1, 1, 0, 0), time.dateTime(2006, 1, 1, 0, 0));
  assert.lt(
      time.dateTime(2006, 1, 1, 0, 0), time.dateTime(2006, 1, 1, 1, 0));
  assert.lt(
      time.dateTime(2006, 1, 1, 0, 0), time.dateTime(2006, 1, 1, 0, 1));
  assert.lt(
      time.dateTime(2006, 1, 1, 12, 59), time.dateTime(2006, 1, 2, 0, 0));
  assert.lt(
      time.dateTime(2006, 1, 1, 0, 0), time.dateTime(2006, 1, 2, 0, 0));
  assert.lt(
      time.dateTime(2006, 1, 1, 0, 0), time.dateTime(2006, 2, 1, 0, 0));
  assert.lt(
      time.dateTime(2006, 1, 3, 0, 0), time.dateTime(2006, 2, 1, 0, 0));
  assert.lt(
      time.dateTime(2005, 12, 31, 0, 0), time.dateTime(2006, 1, 1, 0, 0));
  assert.eq(
      time.dateTime(1, 1, 1, 0, 0), time.dateTime(1, 1, 1, 0, 0));
  assert.lt(
      time.dateTime(1, 1, 1, 0, 0), time.dateTime(1, 1, 2, 0, 0));
  assert.lt(
      time.dateTime(1, 1, 1, 0, 0), time.dateTime(2006, 1, 1, 0, 0));
  assert.lt(
      time.dateTime(1, 1, 1, 0, 0), time.dateTime(1, 2, 1, 0, 0));
  assert.lt(
      time.dateTime(0, 12, 31, 0, 0), time.dateTime(1, 1, 1, 0, 0));

  // comparing date and date times
  assert.lt(time.date(2006, 1, 1), time.dateTime(2006, 1, 1, 0, 0));
  assert.lt(time.dateTime(2006, 1, 1, 12, 59), time.date(2006, 1, 2));
});

register('testNormalizedDate', function testNormalizedDate() {
  assert.eq('20060301', time.toIcal(time.normalizedDate(2006,  2, 29)));
  assert.eq('20071001', time.toIcal(time.normalizedDate(2006, 22, 1)));
  assert.eq('20050801', time.toIcal(time.normalizedDate(2006, -4, 1)));
  assert.eq('20060520', time.toIcal(time.normalizedDate(2006,  4, 50)));
  assert.eq('20060331', time.toIcal(time.normalizedDate(2006,  4, 0)));
  assert.eq('20060321', time.toIcal(time.normalizedDate(2006,  4, -10)));

  assert.eq('20041115', time.toIcal(time.normalizedDate(2006, -13, 15)));
  assert.eq('20041215', time.toIcal(time.normalizedDate(2006, -12, 15)));
  assert.eq('20050115', time.toIcal(time.normalizedDate(2006, -11, 15)));
  assert.eq('20051215', time.toIcal(time.normalizedDate(2006,   0, 15)));
  assert.eq('20061115', time.toIcal(time.normalizedDate(2006,  11, 15)));
  assert.eq('20061215', time.toIcal(time.normalizedDate(2006,  12, 15)));
  assert.eq('20070115', time.toIcal(time.normalizedDate(2006,  13, 15)));
  assert.eq('20081115', time.toIcal(time.normalizedDate(2006,  35, 15)));
  assert.eq('20081215', time.toIcal(time.normalizedDate(2006,  36, 15)));
  assert.eq('20090115', time.toIcal(time.normalizedDate(2006,  37, 15)));

  assert.eq('20330831', time.toIcal(time.normalizedDate(2006, 4, 10015)));
  assert.eq('19781128', time.toIcal(time.normalizedDate(2006, 4, -9985)));
});

register('testNormalizedDateTime', function testNormalizedDateTime() {
  assert.eq('20060301T120000',
               time.toIcal(time.normalizedDateTime(2006,  2, 29, 12, 0)));
  assert.eq('20060301T000000',
               time.toIcal(time.normalizedDateTime(2006,  2, 28, 24, 0)));
  assert.eq('20060302T020000',
               time.toIcal(time.normalizedDateTime(2006,  2, 28, 50, 0)));
  assert.eq('20060302T033000',
               time.toIcal(time.normalizedDateTime(2006,  2, 28, 50, 90)));
  assert.eq('20060227T233000',
               time.toIcal(time.normalizedDateTime(2006,  2, 28, -1, 30)));
  assert.eq('20060228T233000',
               time.toIcal(time.normalizedDateTime(2006,  3, 1, -1, 30)));
  assert.eq('20051231T233000',
               time.toIcal(time.normalizedDateTime(2006,  1, 1, -1, 30)));
});

register('testYear', function testYear() {
  assert.eq(2006, time.year(time.date(2006, 1, 1)));
  assert.eq(2006, time.year(time.dateTime(2006, 1, 1, 12, 0)));
  assert.eq(1900, time.year(time.date(1900, 1, 1)));
  assert.eq(4000, time.year(time.date(4000, 1, 1)));
  assert.eq(50, time.year(time.date(50, 1, 1)));
});

register('testMonth', function testMonth() {
  assert.eq(1, time.month(time.date(2006, 1, 1)));
  assert.eq(2, time.month(time.date(2006, 2, 1)));
  assert.eq(3, time.month(time.date(2006, 3, 1)));
  assert.eq(4, time.month(time.date(2006, 4, 1)));
  assert.eq(5, time.month(time.date(2006, 5, 1)));
  assert.eq(6, time.month(time.date(2006, 6, 1)));
  assert.eq(7, time.month(time.date(2006, 7, 1)));
  assert.eq(8, time.month(time.date(2006, 8, 1)));
  assert.eq(9, time.month(time.date(2006, 9, 1)));
  assert.eq(10, time.month(time.date(2006, 10, 1)));
  assert.eq(11, time.month(time.date(2006, 11, 1)));
  assert.eq(12, time.month(time.date(2006, 12, 1)));
  assert.eq(6, time.month(time.dateTime(2006, 6, 1, 12, 59)));
});

register('testDay', function testDay() {
  assert.eq(31, time.day(time.date(2006, 1, 31)));
  assert.eq(27, time.day(time.dateTime(2006, 1, 27, 12, 0)));
  assert.eq(12, time.day(time.date(2006, 1, 12)));
  assert.eq(14, time.day(time.date(3000, 9, 14)));
  assert.eq(15, time.day(time.date(-47, 3, 15)));
});

register('testHourMinuteMinuteInDay', function testHourMinuteMinuteInDay() {
  // combined tests for 3 accessors into one method to get around
  // 32K bytecode limit for classes
  assert.eq(0, time.hour(time.dateTime(2006, 1, 31, 0, 0)));
  assert.eq(4, time.hour(time.dateTime(2006, 1, 27, 4, 15)));
  assert.eq(12, time.hour(time.dateTime(2006, 1, 12, 12, 45)));
  assert.eq(18, time.hour(time.dateTime(3000, 9, 14, 18, 30)));
  assert.eq(23, time.hour(time.dateTime(-47, 3, 15, 23, 59)));

  assert.eq(0, time.minute(time.dateTime(2006, 1, 31, 0, 0)));
  assert.eq(15, time.minute(time.dateTime(2006, 1, 27, 4, 15)));
  assert.eq(45, time.minute(time.dateTime(2006, 1, 12, 12, 45)));
  assert.eq(30, time.minute(time.dateTime(3000, 9, 14, 18, 30)));
  assert.eq(59, time.minute(time.dateTime(-47, 3, 15, 23, 59)));

  assert.eq(0, time.minuteInDay(time.dateTime(2006, 1, 31, 0, 0)));
  assert.eq(255, time.minuteInDay(time.dateTime(2006, 1, 27, 4, 15)));
  assert.eq(765, time.minuteInDay(time.dateTime(2006, 1, 12, 12, 45)));
  assert.eq(1110, time.minuteInDay(time.dateTime(3000, 9, 14, 18, 30)));
  assert.eq(1439, time.minuteInDay(time.dateTime(-47, 3, 15, 23, 59)));
});

register('testHasTime', function testHasTime() {
  assert.isTrue(time.isDate(time.date(2006, 1, 1)));
  assert.isTrue(time.isDate(time.date(2006, 12, 31)));
  assert.isTrue(time.isDate(time.date(2006, 2, 28)));
  assert.isTrue(time.isDate(time.date(2006, 2, 29)));
  assert.isFalse(time.isDate(time.dateTime(2006, 1, 1, 0, 0)));
  assert.isFalse(time.isDate(time.dateTime(2006, 1, 1, 4, 0)));
  assert.isFalse(time.isDate(time.dateTime(2006, 12, 31, 0, 0)));
  assert.isFalse(time.isDate(time.dateTime(2006, 2, 28, 12, 59)));
  assert.isFalse(time.isDate(time.dateTime(2006, 2, 28, 0, 0)));
  assert.isFalse(time.isDate(time.dateTime(2006, 2, 29, 6, 30)));
});

register('testPlusDays', function testPlusDays() {
  assert.eq(
      '20080101', time.toIcal(time.plusDays(time.date(2008, 1, 1), 0)));
  assert.eq(
      '20071231', time.toIcal(time.plusDays(time.date(2008, 1, 1), -1)));
  assert.eq(
      '20071201', time.toIcal(time.plusDays(time.date(2008, 1, 1), -31)));
  assert.eq(
      '20080102', time.toIcal(time.plusDays(time.date(2008, 1, 1), 1)));
  assert.eq(
      '20080131', time.toIcal(time.plusDays(time.date(2008, 1, 1), 30)));
  assert.eq(
      '20080201', time.toIcal(time.plusDays(time.date(2008, 1, 1), 31)));
  assert.eq(
      '20080302', time.toIcal(time.plusDays(time.date(2008, 2, 1), 30)));
  assert.eq(
      '20081231', time.toIcal(time.plusDays(time.date(2008, 1, 1), 365)));
  assert.eq(
      '20090101', time.toIcal(time.plusDays(time.date(2008, 1, 1), 366)));
  assert.eq(
      '20080101', time.toIcal(time.plusDays(time.date(2007, 1, 1), 365)));
  assert.eq(
      '20080102', time.toIcal(time.plusDays(time.date(2007, 1, 1), 366)));
  assert.eq(
      '20070101', time.toIcal(time.plusDays(time.date(2008, 1, 1), -365)));
  assert.eq(
      '20061231', time.toIcal(time.plusDays(time.date(2008, 1, 1), -366)));
  assert.eq(
      '20071201T123000',
      time.toIcal(time.plusDays(time.dateTime(2008, 1, 1, 12, 30), -31)));
  assert.eq(
      '20080102T040000',
      time.toIcal(time.plusDays(time.dateTime(2008, 1, 1, 4, 0), 1)));
  assert.eq(
      '20080131T151500',
      time.toIcal(time.plusDays(time.dateTime(2008, 1, 1, 15, 15), 30)));
});

register('testNextDate', function testNextDate() {
  assert.eq('20080101', time.toIcal(time.nextDate(time.date(2007, 12, 31))));
  assert.eq('20080102', time.toIcal(time.nextDate(time.date(2008, 1, 1))));
  assert.eq('20080103', time.toIcal(time.nextDate(time.date(2008, 1, 2))));
  assert.eq('20080104', time.toIcal(time.nextDate(time.date(2008, 1, 3))));
  assert.eq('20080131', time.toIcal(time.nextDate(time.date(2008, 1, 30))));
  assert.eq('20080201', time.toIcal(time.nextDate(time.date(2008, 1, 31))));
  assert.eq('20080202', time.toIcal(time.nextDate(time.date(2008, 2, 1))));
  assert.eq('20080228', time.toIcal(time.nextDate(time.date(2008, 2, 27))));
  assert.eq('20080229', time.toIcal(time.nextDate(time.date(2008, 2, 28))));
  assert.eq('20080301', time.toIcal(time.nextDate(time.date(2008, 2, 29))));
  assert.eq('20070228', time.toIcal(time.nextDate(time.date(2007, 2, 27))));
  assert.eq('20070301', time.toIcal(time.nextDate(time.date(2007, 2, 28))));
  assert.eq('20070302', time.toIcal(time.nextDate(time.date(2007, 3, 1))));

  assert.eq(
      '20080101T123000',
      time.toIcal(time.nextDate(time.dateTime(2007, 12, 31, 12, 30))));
  assert.eq(
      '20080102T043000',
      time.toIcal(time.nextDate(time.dateTime(2008, 1, 1, 4, 30))));
  assert.eq(
      '20080131T164500',
      time.toIcal(time.nextDate(time.dateTime(2008, 1, 30, 16, 45))));
  assert.eq(
      '20080201T123000',
      time.toIcal(time.nextDate(time.dateTime(2008, 1, 31, 12, 30))));
});

register('testDaysBetween', function testDaysBetween() {
  assert.eq(   0,
      time.daysBetween(time.date(2003, 12, 31), time.date(2003, 12, 31)));
  assert.eq( -60,
      time.daysBetween(time.date(2003, 12, 31), time.date(2004, 2, 29)));
  assert.eq( -66,
      time.daysBetween(time.date(2003, 12, 31), time.date(2004, 3, 6)));
  assert.eq( -69,
      time.daysBetween(time.date(2003, 12, 31), time.date(2004, 3, 9)));
  assert.eq(-305,
      time.daysBetween(time.date(2003, 12, 31), time.date(2004, 10, 31)));
  assert.eq(-306,
      time.daysBetween(time.date(2003, 12, 31), time.date(2004, 11, 1)));

  assert.eq(  60,
      time.daysBetween(time.date(2004, 2, 29), time.date(2003, 12, 31)));
  assert.eq(   0,
      time.daysBetween(time.date(2004, 2, 29), time.date(2004, 2, 29)));
  assert.eq(  -6,
      time.daysBetween(time.date(2004, 2, 29), time.date(2004, 3, 6)));
  assert.eq(  -9,
      time.daysBetween(time.date(2004, 2, 29), time.date(2004, 3, 9)));
  assert.eq(-245,
      time.daysBetween(time.date(2004, 2, 29), time.date(2004, 10, 31)));
  assert.eq(-246,
      time.daysBetween(time.date(2004, 2, 29), time.date(2004, 11, 1)));

  assert.eq(  66,
      time.daysBetween(time.date(2004, 3, 6), time.date(2003, 12, 31)));
  assert.eq(   6,
      time.daysBetween(time.date(2004, 3, 6), time.date(2004, 2, 29)));
  assert.eq(   0,
      time.daysBetween(time.date(2004, 3, 6), time.date(2004, 3, 6)));
  assert.eq(  -3,
      time.daysBetween(time.date(2004, 3, 6), time.date(2004, 3, 9)));
  assert.eq(-239,
      time.daysBetween(time.date(2004, 3, 6), time.date(2004, 10, 31)));
  assert.eq(-240,
      time.daysBetween(time.date(2004, 3, 6), time.date(2004, 11, 1)));

  assert.eq(  69,
      time.daysBetween(time.date(2004, 3, 9), time.date(2003, 12, 31)));
  assert.eq(   9,
      time.daysBetween(time.date(2004, 3, 9), time.date(2004, 2, 29)));
  assert.eq(   3,
      time.daysBetween(time.date(2004, 3, 9), time.date(2004, 3, 6)));
  assert.eq(   0,
      time.daysBetween(time.date(2004, 3, 9), time.date(2004, 3, 9)));
  assert.eq(-236,
      time.daysBetween(time.date(2004, 3, 9), time.date(2004, 10, 31)));
  assert.eq(-237,
      time.daysBetween(time.date(2004, 3, 9), time.date(2004, 11, 1)));

  assert.eq( 305,
      time.daysBetween(time.date(2004, 10, 31), time.date(2003, 12, 31)));
  assert.eq( 245,
      time.daysBetween(time.date(2004, 10, 31), time.date(2004, 2, 29)));
  assert.eq( 239,
      time.daysBetween(time.date(2004, 10, 31), time.date(2004, 3, 6)));
  assert.eq( 236,
      time.daysBetween(time.date(2004, 10, 31), time.date(2004, 3, 9)));
  assert.eq(   0,
      time.daysBetween(time.date(2004, 10, 31), time.date(2004, 10, 31)));
  assert.eq(  -1,
      time.daysBetween(time.date(2004, 10, 31), time.date(2004, 11, 1)));

  assert.eq( 306,
      time.daysBetween(time.date(2004, 11, 1), time.date(2003, 12, 31)));
  assert.eq( 246,
      time.daysBetween(time.date(2004, 11, 1), time.date(2004, 2, 29)));
  assert.eq( 240,
      time.daysBetween(time.date(2004, 11, 1), time.date(2004, 3, 6)));
  assert.eq( 237,
      time.daysBetween(time.date(2004, 11, 1), time.date(2004, 3, 9)));
  assert.eq(   1,
      time.daysBetween(time.date(2004, 11, 1), time.date(2004, 10, 31)));
  assert.eq(   0,
      time.daysBetween(time.date(2004, 11, 1), time.date(2004, 11, 1)));

  assert.eq(-365,
      time.daysBetween(time.date(2003, 1, 1), time.date(2004, 1, 1)));
  assert.eq(-366,
      time.daysBetween(time.date(2004, 1, 1), time.date(2005, 1, 1)));
  assert.eq(-365,
      time.daysBetween(time.date(2005, 1, 1), time.date(2006, 1, 1)));
});

register('testDayOfYear', function testDayOfYear() {
  assert.eq(0, time.dayOfYear(time.date(2005, 1, 1)));
  assert.eq(31, time.dayOfYear(time.date(2006, 2, 1)));
  assert.eq(31 + 28, time.dayOfYear(time.date(2007, 3, 1)));
  assert.eq(31 + 28 + 31, time.dayOfYear(time.date(2009, 4, 1)));
  assert.eq(31 + 28 + 31 + 30, time.dayOfYear(time.date(2010, 5, 1)));
  assert.eq(31 + 28 + 31 + 30,
      time.dayOfYear(time.date(2011, 5, 1)));
  assert.eq(31 + 28 + 31 + 30 + 31,
      time.dayOfYear(time.date(2013, 6, 1)));
  assert.eq(31 + 28 + 31 + 30 + 31 + 30,
      time.dayOfYear(time.date(2014, 7, 1)));
  assert.eq(31 + 28 + 31 + 30 + 31 + 30 + 31,
      time.dayOfYear(time.date(2015, 8, 1)));
  assert.eq(31 + 28 + 31 + 30 + 31 + 30 + 31 + 31,
      time.dayOfYear(time.date(2017, 9, 1)));
  assert.eq(31 + 28 + 31 + 30 + 31 + 30 + 31 + 31 + 30,
      time.dayOfYear(time.date(2018, 10, 1)));
  assert.eq(31 + 28 + 31 + 30 + 31 + 30 + 31 + 31 + 30 + 31 + 20,
      time.dayOfYear(time.date(2019, 11, 21)));
  assert.eq(31 + 28 + 31 + 30 + 31 + 30 + 31 + 31 + 30 + 31 + 30,
      time.dayOfYear(time.date(2021, 12, 1)));
  assert.eq(364, time.dayOfYear(time.date(2022, 12, 31)));

  assert.eq(0, time.dayOfYear(time.date(2004, 1, 1)));
  assert.eq(20, time.dayOfYear(time.date(2004, 1, 21)));
  assert.eq(31,
      time.dayOfYear(time.date(2004, 2, 1)));
  assert.eq(31 + 29,
      time.dayOfYear(time.date(2004, 3, 1)));
  assert.eq(31 + 29 + 31,
      time.dayOfYear(time.date(2008, 4, 1)));
  assert.eq(31 + 29 + 31 + 30,
      time.dayOfYear(time.date(2012, 5, 1)));
  assert.eq(31 + 29 + 31 + 30 + 31 + 7,
      time.dayOfYear(time.date(2020, 6, 8)));
  assert.eq(31 + 29 + 31 + 30 + 31 + 30,
      time.dayOfYear(time.date(2024, 7, 1)));
  assert.eq(31 + 29 + 31 + 30 + 31 + 30 + 31,
      time.dayOfYear(time.date(2028, 8, 1)));
  assert.eq(31 + 29 + 31 + 30 + 31 + 30 + 31 + 31,
      time.dayOfYear(time.date(2032, 9, 1)));
  assert.eq(31 + 29 + 31 + 30 + 31 + 30 + 31 + 31 + 30,
      time.dayOfYear(time.date(2036, 10, 1)));
  assert.eq(31 + 29 + 31 + 30 + 31 + 30 + 31 + 31 + 30 + 31,
      time.dayOfYear(time.date(2040, 11, 1)));
  assert.eq(31 + 29 + 31 + 30 + 31 + 30 + 31 + 31 + 30 + 31 + 30,
      time.dayOfYear(time.date(2044, 12, 1)));
  assert.eq(365, time.dayOfYear(time.date(2048, 12, 31)));
});

register('testToDateOnOrAfter', function testToDateOnOrAfter() {
  assert.eq(
      '20080101',
      time.toIcal(time.toDateOnOrAfter(time.parseIcal('20080101'))));
  assert.eq(
      '20080102',
      time.toIcal(time.toDateOnOrAfter(time.parseIcal('20080102'))));
  assert.eq(
      '20080615',
      time.toIcal(time.toDateOnOrAfter(time.parseIcal('20080615'))));

  assert.eq(
      '20080101',
      time.toIcal(time.toDateOnOrAfter(time.parseIcal('20080101T000000'))));
  assert.eq(
      '20080102',
      time.toIcal(time.toDateOnOrAfter(time.parseIcal('20080102T000000'))));
  assert.eq(
      '20080615',
      time.toIcal(time.toDateOnOrAfter(time.parseIcal('20080615T000000'))));

  assert.eq(
      '20080102',
      time.toIcal(time.toDateOnOrAfter(time.parseIcal('20080101T000100'))));
  assert.eq(
      '20080103',
      time.toIcal(time.toDateOnOrAfter(time.parseIcal('20080102T120000'))));
  assert.eq(
      '20080616',
      time.toIcal(time.toDateOnOrAfter(time.parseIcal('20080615T235900'))));
});

register('testWithYear', function testWithYear() {
  assert.eq(
      '20070101',
      time.toIcal(time.withYear(time.date(2007, 1, 1), 2007)));
  assert.eq(
      '20080301',
      time.toIcal(time.withYear(time.date(0, 3, 1), 2008)));
  assert.eq(
      '00070103',
      time.toIcal(time.withYear(time.date(2107, 1, 3), 7)));
  assert.eq(
      '20070615',
      time.toIcal(time.withYear(time.date(2007, 6, 15), 2007)));
  assert.eq(
      '20081114',
      time.toIcal(time.withYear(time.date(3007, 11, 14), 2008)));
  assert.eq(
      '30000401T124500',
      time.toIcal(time.withYear(time.dateTime(2007, 4, 1, 12, 45), 3000)));
});

register('testWithMonth', function testWithMonth() {
  assert.eq(
      '20070101',
      time.toIcal(time.withMonth(time.date(2007, 1, 1), 1)));
  assert.eq(
      '00000401',
      time.toIcal(time.withMonth(time.date(0, 3, 1), 4)));
  assert.eq(
      '21071203',
      time.toIcal(time.withMonth(time.date(2107, 1, 3), 12)));
  assert.eq(
      '20070715',
      time.toIcal(time.withMonth(time.date(2007, 6, 15), 7)));
  assert.eq(
      '30070114',
      time.toIcal(time.withMonth(time.date(3007, 11, 14), 1)));
  assert.eq(
      '20071201T124500',
      time.toIcal(time.withMonth(time.dateTime(2007, 4, 1, 12, 45), 12)));
});

register('testWithDay', function testWithDay() {
  assert.eq(
      '20070101',
      time.toIcal(time.withDay(time.date(2007, 1, 1), 1)));
  assert.eq(
      '00000304',
      time.toIcal(time.withDay(time.date(0, 3, 1), 4)));
  assert.eq(
      '21070131',
      time.toIcal(time.withDay(time.date(2107, 1, 3), 31)));
  assert.eq(
      '20070607',
      time.toIcal(time.withDay(time.date(2007, 6, 15), 7)));
  assert.eq(
      '30071101',
      time.toIcal(time.withDay(time.date(3007, 11, 14), 1)));
  assert.eq(
      '20070412T124500',
      time.toIcal(time.withDay(time.dateTime(2007, 4, 1, 12, 45), 12)));
});

register('testWithHour', function testWithHour() {
  assert.eq(
      '20070401T124500',
      time.toIcal(time.withHour(time.dateTime(2007, 4, 1, 12, 45), 12)));
  assert.eq(
      '20070606T034500',
      time.toIcal(time.withHour(time.dateTime(2007, 6, 6, 12, 45), 3)));
  assert.eq(
      '20071231T234500',
      time.toIcal(time.withHour(time.dateTime(2007, 12, 31, 12, 45), 23)));
  assert.eq(
      '20071231', time.toIcal(time.withHour(time.date(2007, 12, 31), 23)));
});

register('testWithMinute', function testWithMinute() {
  assert.eq(
      '20070401T124500',
      time.toIcal(time.withMinute(time.dateTime(2007, 4, 1, 12, 45), 45)));
  assert.eq(
      '20070606T121500',
      time.toIcal(time.withMinute(time.dateTime(2007, 6, 6, 12, 45), 15)));
  assert.eq(
      '20071231T125900',
      time.toIcal(time.withMinute(time.dateTime(2007, 12, 31, 12, 45), 59)));
  assert.eq(
      '20071231', time.toIcal(time.withMinute(time.date(2007, 12, 31), 23)));
});

register('testWithTime', function testWithTime() {
  assert.eq(
      '20070401T124500',
      time.toIcal(time.withTime(time.dateTime(2007, 4, 1, 12, 45), 12, 45)));
  assert.eq(
      '20070606T030100',
      time.toIcal(time.withTime(time.dateTime(2007, 6, 6, 12, 45), 3, 1)));
  assert.eq(
      '20071231T235900',
      time.toIcal(time.withTime(time.dateTime(2007, 12, 31, 12, 45), 23, 59)));
  assert.eq(
      '20071231T061500',
      time.toIcal(time.withTime(time.date(2007, 12, 31), 6, 15)));

});

if (require.main === module.id)
    require("os").exit(require("test/runner").run(exports));

