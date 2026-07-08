#include "MinitelESP32.h"

#include <pgmspace.h>

namespace {
constexpr uint8_t kBell = 0x07;
constexpr uint8_t kLineFeed = 0x0A;
constexpr uint8_t kFormFeed = 0x0C;
constexpr uint8_t kGraphicMode = 0x0E;
constexpr uint8_t kTextMode = 0x0F;
constexpr uint8_t kCursorOn = 0x11;
constexpr uint8_t kCursorOff = 0x14;
constexpr uint8_t kClearToEndOfLine = 0x18;
constexpr uint8_t kEscape = 0x1B;
constexpr uint8_t kHome = 0x1E;
constexpr uint8_t kMoveTo = 0x1F;

constexpr uint8_t kMinitelCoordinateBase = 0x40;
constexpr uint8_t kAsciiSpace = 0x20;
constexpr uint8_t kMosaicBottomRightBit = 0x40;
}  // namespace

MinitelESP32::MinitelESP32(HardwareSerial &serial, int8_t rxPin, int8_t txPin,
                           uint32_t baud, uint32_t serialConfig)
    : _serial(serial),
      _rxPin(rxPin),
      _txPin(txPin),
      _baud(baud),
      _serialConfig(serialConfig) {}

void MinitelESP32::begin(bool inputPullup) {
  if (_rxPin >= 0) {
    pinMode(_rxPin, inputPullup ? INPUT_PULLUP : INPUT);
  }

  _serial.begin(_baud, _serialConfig, _rxPin, _txPin);
}

bool MinitelESP32::setBaudRate(uint32_t baud, bool inputPullup) {
  if (baud == 0) {
    return false;
  }

  _baud = baud;
  end();
  delay(10);
  begin(inputPullup);
  delay(20);
  drainInput();
  return true;
}

uint32_t MinitelESP32::detectBaudRate(const uint32_t *baudRates,
                                      size_t baudRateCount, uint8_t pingByte,
                                      const uint8_t *pongBytes,
                                      size_t pongByteCount,
                                      uint16_t timeoutMs, uint8_t attempts,
                                      bool inputPullup) {
  if (baudRates == nullptr || baudRateCount == 0 || attempts == 0) {
    return 0;
  }

  const uint32_t previousBaud = _baud;

  for (size_t i = 0; i < baudRateCount; ++i) {
    const uint32_t baud = baudRates[i];
    if (baud == 0) {
      continue;
    }

    setBaudRate(baud, inputPullup);
    if (pingPong(pingByte, pongBytes, pongByteCount, timeoutMs, attempts)) {
      return baud;
    }
  }

  setBaudRate(previousBaud, inputPullup);
  return 0;
}

uint32_t MinitelESP32::detectBaudRate(uint16_t timeoutMs, uint8_t attempts,
                                      bool inputPullup) {
  static const uint32_t baudRates[] = {1200, 300, 4800, 9600};
  static const uint8_t pongBytes[] = {0x05, 0x06};

  return detectBaudRate(baudRates, sizeof(baudRates) / sizeof(baudRates[0]),
                        0x05, pongBytes, sizeof(pongBytes), timeoutMs,
                        attempts, inputPullup);
}

void MinitelESP32::end() { _serial.end(); }

size_t MinitelESP32::write(uint8_t value) { return _serial.write(value); }

size_t MinitelESP32::write(const uint8_t *buffer, size_t size) {
  if (buffer == nullptr || size == 0) {
    return 0;
  }

  return _serial.write(buffer, size);
}

void MinitelESP32::sendByte(uint8_t value) { write(value); }

size_t MinitelESP32::sendText(const char *text) { return print(text); }

size_t MinitelESP32::sendLine(const char *text) { return println(text); }

void MinitelESP32::clear() { write(kFormFeed); }

void MinitelESP32::clearToEndOfLine() { write(kClearToEndOfLine); }

void MinitelESP32::home() { write(kHome); }

void MinitelESP32::resetDisplay() {
  textMode();
  normalText();
  clear();
  home();
}

void MinitelESP32::moveTo(uint8_t column, uint8_t row) {
  write(kMoveTo);
  write(kMinitelCoordinateBase + clampRow(row));
  write(kMinitelCoordinateBase + clampColumn(column));
}

void MinitelESP32::cursor(bool enabled) {
  write(enabled ? kCursorOn : kCursorOff);
}

void MinitelESP32::textMode() { write(kTextMode); }

void MinitelESP32::graphicMode() { write(kGraphicMode); }

void MinitelESP32::drawingMode(bool enabled) {
  if (enabled) {
    graphicMode();
  } else {
    textMode();
  }
}

void MinitelESP32::enableDrawing() { graphicMode(); }

void MinitelESP32::disableDrawing() { textMode(); }

void MinitelESP32::setTextSize(TextSize size) {
  switch (size) {
    case TextSize::Normal:
      escape('L');
      break;
    case TextSize::DoubleHeight:
      escape('M');
      break;
    case TextSize::DoubleWidth:
      escape('N');
      break;
    case TextSize::DoubleSize:
      escape('O');
      break;
  }
}

void MinitelESP32::normalText() { setTextSize(TextSize::Normal); }

void MinitelESP32::smallText() { setTextSize(TextSize::Normal); }

void MinitelESP32::bigText() { setTextSize(TextSize::DoubleSize); }

void MinitelESP32::foreground(Color color) {
  escape(0x40 + static_cast<uint8_t>(color));
}

void MinitelESP32::background(Color color) {
  escape(0x50 + static_cast<uint8_t>(color));
}

void MinitelESP32::colors(Color foregroundColor, Color backgroundColor) {
  foreground(foregroundColor);
  background(backgroundColor);
}

size_t MinitelESP32::printAt(uint8_t column, uint8_t row, const char *text,
                             TextSize size) {
  moveTo(column, row);
  setTextSize(size);
  return print(text);
}

size_t MinitelESP32::smallTextAt(uint8_t column, uint8_t row,
                                 const char *text) {
  return printAt(column, row, text, TextSize::Normal);
}

size_t MinitelESP32::bigTextAt(uint8_t column, uint8_t row, const char *text) {
  return printAt(column, row, text, TextSize::DoubleSize);
}

void MinitelESP32::beep(uint8_t times, uint16_t gapMs) {
  for (uint8_t i = 0; i < times; ++i) {
    write(kBell);
    if (i + 1 < times && gapMs > 0) {
      delay(gapMs);
    }
  }
}

int MinitelESP32::available() { return _serial.available(); }

int MinitelESP32::read() { return _serial.read(); }

int MinitelESP32::peek() { return _serial.peek(); }

void MinitelESP32::drainInput() {
  while (_serial.available() > 0) {
    _serial.read();
  }
}

bool MinitelESP32::readByte(uint8_t &value) {
  const int next = read();
  if (next < 0) {
    return false;
  }

  value = static_cast<uint8_t>(next);
  return true;
}

MinitelESP32::Key MinitelESP32::readKey() {
  Key key;
  uint8_t value = 0;
  if (!readByte(value)) {
    return key;
  }

  key.code = value;

  if (value >= 0x20 && value <= 0x7E) {
    key.type = KeyType::Character;
    key.character = static_cast<char>(value);
    return key;
  }

  switch (value) {
    case '\r':
    case kLineFeed:
      key.type = KeyType::Enter;
      break;
    case '\b':
      key.type = KeyType::Backspace;
      break;
    case 0x7F:
      key.type = KeyType::DeleteKey;
      break;
    case kEscape:
      key.type = KeyType::Escape;
      break;
    default:
      key.type = KeyType::Control;
      break;
  }

  return key;
}

size_t MinitelESP32::readLine(char *buffer, size_t length,
                              uint32_t timeoutMs, bool echo) {
  if (buffer == nullptr || length == 0) {
    return 0;
  }

  size_t count = 0;
  const uint32_t startedAt = millis();

  while (count + 1 < length) {
    if (available() <= 0) {
      if (timeoutMs == 0 || millis() - startedAt >= timeoutMs) {
        break;
      }
      delay(1);
      continue;
    }

    const int next = read();
    if (next < 0) {
      continue;
    }

    const uint8_t value = static_cast<uint8_t>(next);
    if (echo) {
      write(value);
    }

    if (value == '\r' || value == kLineFeed) {
      break;
    }

    buffer[count++] = static_cast<char>(value);
  }

  buffer[count] = '\0';
  return count;
}

void MinitelESP32::drawMosaicCell(uint8_t sextantsMask) {
  write(makeMosaicByte(sextantsMask));
}

void MinitelESP32::drawMosaicCell(bool topLeft, bool topRight,
                                  bool middleLeft, bool middleRight,
                                  bool bottomLeft, bool bottomRight) {
  write(makeMosaicByte(topLeft, topRight, middleLeft, middleRight, bottomLeft,
                       bottomRight));
}

void MinitelESP32::drawImage(const MinitelImage &image) {
  drawImage(image.data, image.length, image.storedInProgmem);
}

void MinitelESP32::drawImageAt(const MinitelImage &image, uint8_t column,
                               uint8_t row) {
  drawImageAt(image.data, image.length, column, row, image.storedInProgmem);
}

void MinitelESP32::drawImage(const uint8_t *commands, size_t length,
                             bool storedInProgmem) {
  if (commands == nullptr || length == 0) {
    return;
  }

  for (size_t i = 0; i < length; ++i) {
    const uint8_t value =
        storedInProgmem ? pgm_read_byte(commands + i) : commands[i];
    write(value);
  }
}

void MinitelESP32::drawImageAt(const uint8_t *commands, size_t length,
                               uint8_t column, uint8_t row,
                               bool storedInProgmem) {
  if (commands == nullptr || length == 0) {
    return;
  }

  uint8_t originColumn = Columns + 1;
  uint8_t originRow = Rows + 1;
  bool hasCoordinates = false;

  for (size_t i = 0; i + 2 < length; ++i) {
    const uint8_t value =
        storedInProgmem ? pgm_read_byte(commands + i) : commands[i];
    if (value != kMoveTo) {
      continue;
    }

    const uint8_t rowByte =
        storedInProgmem ? pgm_read_byte(commands + i + 1) : commands[i + 1];
    const uint8_t columnByte =
        storedInProgmem ? pgm_read_byte(commands + i + 2) : commands[i + 2];
    if (!isMoveCoordinate(rowByte, columnByte)) {
      continue;
    }

    const uint8_t sourceRow = rowByte - kMinitelCoordinateBase;
    const uint8_t sourceColumn = columnByte - kMinitelCoordinateBase;
    if (sourceRow < originRow) {
      originRow = sourceRow;
    }
    if (sourceColumn < originColumn) {
      originColumn = sourceColumn;
    }

    hasCoordinates = true;
    i += 2;
  }

  if (!hasCoordinates) {
    drawImage(commands, length, storedInProgmem);
    return;
  }

  for (size_t i = 0; i < length; ++i) {
    const uint8_t value =
        storedInProgmem ? pgm_read_byte(commands + i) : commands[i];

    if (value != kMoveTo || i + 2 >= length) {
      write(value);
      continue;
    }

    const uint8_t rowByte =
        storedInProgmem ? pgm_read_byte(commands + i + 1) : commands[i + 1];
    const uint8_t columnByte =
        storedInProgmem ? pgm_read_byte(commands + i + 2) : commands[i + 2];
    if (!isMoveCoordinate(rowByte, columnByte)) {
      write(value);
      continue;
    }

    const uint8_t sourceRow = rowByte - kMinitelCoordinateBase;
    const uint8_t sourceColumn = columnByte - kMinitelCoordinateBase;
    const uint8_t targetRow = row + (sourceRow - originRow);
    const uint8_t targetColumn = column + (sourceColumn - originColumn);

    moveTo(targetColumn, targetRow);
    i += 2;
  }
}

uint8_t MinitelESP32::makeMosaicByte(uint8_t sextantsMask) {
  uint8_t value = kAsciiSpace;

  value |= sextantsMask & (TopLeft | TopRight | MiddleLeft | MiddleRight |
                           BottomLeft);
  if ((sextantsMask & BottomRight) != 0) {
    value |= kMosaicBottomRightBit;
  }

  return value;
}

uint8_t MinitelESP32::makeMosaicByte(bool topLeft, bool topRight,
                                     bool middleLeft, bool middleRight,
                                     bool bottomLeft, bool bottomRight) {
  uint8_t mask = 0;
  if (topLeft) {
    mask |= TopLeft;
  }
  if (topRight) {
    mask |= TopRight;
  }
  if (middleLeft) {
    mask |= MiddleLeft;
  }
  if (middleRight) {
    mask |= MiddleRight;
  }
  if (bottomLeft) {
    mask |= BottomLeft;
  }
  if (bottomRight) {
    mask |= BottomRight;
  }

  return makeMosaicByte(mask);
}

bool MinitelESP32::pingPong(uint8_t pingByte, const uint8_t *pongBytes,
                            size_t pongByteCount, uint16_t timeoutMs,
                            uint8_t attempts) {
  for (uint8_t attempt = 0; attempt < attempts; ++attempt) {
    drainInput();
    write(pingByte);
    _serial.flush();

    const uint32_t startedAt = millis();
    while (millis() - startedAt < timeoutMs) {
      const int received = read();
      if (received < 0) {
        delay(1);
        continue;
      }

      if (pongBytes == nullptr || pongByteCount == 0) {
        return true;
      }

      for (size_t i = 0; i < pongByteCount; ++i) {
        if (static_cast<uint8_t>(received) == pongBytes[i]) {
          return true;
        }
      }
    }
  }

  return false;
}

uint8_t MinitelESP32::clampColumn(uint8_t column) {
  if (column < 1) {
    return 1;
  }
  if (column > Columns) {
    return Columns;
  }
  return column;
}

uint8_t MinitelESP32::clampRow(uint8_t row) {
  if (row < 1) {
    return 1;
  }
  if (row > Rows) {
    return Rows;
  }
  return row;
}

bool MinitelESP32::isMoveCoordinate(uint8_t rowByte, uint8_t columnByte) {
  const uint8_t minRow = kMinitelCoordinateBase + 1;
  const uint8_t maxRow = kMinitelCoordinateBase + Rows;
  const uint8_t minColumn = kMinitelCoordinateBase + 1;
  const uint8_t maxColumn = kMinitelCoordinateBase + Columns;

  return rowByte >= minRow && rowByte <= maxRow && columnByte >= minColumn &&
         columnByte <= maxColumn;
}

void MinitelESP32::escape(uint8_t code) {
  write(kEscape);
  write(code);
}
