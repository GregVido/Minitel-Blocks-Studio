#pragma once

#include <Arduino.h>

struct MinitelImage {
  const uint8_t *data;
  size_t length;
  bool storedInProgmem;
};

class MinitelESP32 : public Print {
 public:
  static constexpr uint8_t Columns = 40;
  static constexpr uint8_t Rows = 24;

  enum class Color : uint8_t {
    Black = 0,
    Red,
    Green,
    Yellow,
    Blue,
    Magenta,
    Cyan,
    White,
  };

  enum class TextSize : uint8_t {
    Normal,
    DoubleHeight,
    DoubleWidth,
    DoubleSize,
  };

  enum class KeyType : uint8_t {
    None,
    Character,
    Enter,
    Backspace,
    DeleteKey,
    Escape,
    Control,
    Function,
    Sequence,
  };

  struct Key {
    KeyType type = KeyType::None;
    uint8_t code = 0;
    char character = '\0';
    uint8_t bytes[4] = {0, 0, 0, 0};
    uint8_t length = 0;

    bool available() const { return type != KeyType::None; }
    bool isCharacter() const { return type == KeyType::Character; }
    bool matches(uint8_t first) const {
      return length == 1 && bytes[0] == first;
    }
    bool matches(uint8_t first, uint8_t second) const {
      return length == 2 && bytes[0] == first && bytes[1] == second;
    }
    bool matches(uint8_t first, uint8_t second, uint8_t third) const {
      return length == 3 && bytes[0] == first && bytes[1] == second &&
             bytes[2] == third;
    }
    bool matches(uint8_t first, uint8_t second, uint8_t third,
                 uint8_t fourth) const {
      return length == 4 && bytes[0] == first && bytes[1] == second &&
             bytes[2] == third && bytes[3] == fourth;
    }
  };

  enum MosaicSextant : uint8_t {
    TopLeft = 0x01,
    TopRight = 0x02,
    MiddleLeft = 0x04,
    MiddleRight = 0x08,
    BottomLeft = 0x10,
    BottomRight = 0x20,
  };

  explicit MinitelESP32(HardwareSerial &serial = Serial2, int8_t rxPin = 16,
                        int8_t txPin = 17, uint32_t baud = 1200,
                        uint32_t serialConfig = SERIAL_7E1);

  void begin(bool inputPullup = true);
  bool setBaudRate(uint32_t baud, bool inputPullup = true);
  uint32_t detectBaudRate(const uint32_t *baudRates, size_t baudRateCount,
                          uint8_t pingByte, const uint8_t *pongBytes,
                          size_t pongByteCount, uint16_t timeoutMs = 180,
                          uint8_t attempts = 2, bool inputPullup = true);
  uint32_t detectBaudRate(uint16_t timeoutMs = 300, uint8_t attempts = 3,
                          bool inputPullup = true);
  void end();
  uint32_t baudRate() const { return _baud; }

  Stream &stream() { return _serial; }

  size_t write(uint8_t value) override;
  size_t write(const uint8_t *buffer, size_t size) override;
  using Print::write;

  void sendByte(uint8_t value);
  size_t sendText(const char *text);
  size_t sendLine(const char *text = "");

  void clear();
  void clearToEndOfLine();
  void home();
  void resetDisplay();
  void moveTo(uint8_t column, uint8_t row);
  void cursor(bool enabled);

  void textMode();
  void graphicMode();
  void drawingMode(bool enabled);
  void enableDrawing();
  void disableDrawing();

  void setTextSize(TextSize size);
  void normalText();
  void smallText();
  void bigText();

  void foreground(Color color);
  void background(Color color);
  void colors(Color foregroundColor, Color backgroundColor);

  size_t printAt(uint8_t column, uint8_t row, const char *text,
                 TextSize size = TextSize::Normal);
  size_t smallTextAt(uint8_t column, uint8_t row, const char *text);
  size_t bigTextAt(uint8_t column, uint8_t row, const char *text);

  void beep(uint8_t times = 1, uint16_t gapMs = 80);

  int available();
  int read();
  int peek();
  void drainInput();
  bool readByte(uint8_t &value);
  Key readKey();
  size_t readLine(char *buffer, size_t length, uint32_t timeoutMs = 0,
                  bool echo = false);

  void drawMosaicCell(uint8_t sextantsMask);
  void drawMosaicCell(bool topLeft, bool topRight, bool middleLeft,
                      bool middleRight, bool bottomLeft, bool bottomRight);
  void drawImage(const MinitelImage &image);
  void drawImageAt(const MinitelImage &image, uint8_t column, uint8_t row);
  void drawImage(const uint8_t *commands, size_t length,
                 bool storedInProgmem = true);
  void drawImageAt(const uint8_t *commands, size_t length, uint8_t column,
                   uint8_t row, bool storedInProgmem = true);

  static uint8_t makeMosaicByte(uint8_t sextantsMask);
  static uint8_t makeMosaicByte(bool topLeft, bool topRight, bool middleLeft,
                                bool middleRight, bool bottomLeft,
                                bool bottomRight);

 private:
  HardwareSerial &_serial;
  int8_t _rxPin;
  int8_t _txPin;
  uint32_t _baud;
  uint32_t _serialConfig;
  uint8_t _keySequence[4] = {0, 0, 0, 0};
  uint8_t _keySequenceLength = 0;
  uint32_t _keySequenceStartedAt = 0;

  void resetKeySequence();
  bool keySequenceComplete() const;
  Key finishKeySequence();
  bool pingPong(uint8_t pingByte, const uint8_t *pongBytes,
                size_t pongByteCount, uint16_t timeoutMs, uint8_t attempts);
  bool pingTerminalStatus(uint16_t timeoutMs, uint8_t attempts);
  static uint8_t clampColumn(uint8_t column);
  static uint8_t clampRow(uint8_t row);
  static bool isMoveCoordinate(uint8_t rowByte, uint8_t columnByte);
  void escape(uint8_t code);
};
