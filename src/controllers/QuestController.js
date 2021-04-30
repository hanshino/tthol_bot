const { Message } = require("discord.js");

/**
 * 九宮格解謎
 * @param {Message} Message
 * @param {Object} props
 */
exports.ForestMatrix = (Message, props) => {
  const { room1, room2, number1, number2, sum } = props.groups;

  let matrix = calculate(sum, [
    { name: room1, value: parseInt(number1) },
    { name: room2, value: parseInt(number2) },
  ]);

  Message.channel.send(matrix.map(data => `${data.name}${data.value}`).join(" "));
};

function calculate(sum, rooms) {
  if (sum != 15 && sum != 12) throw "總和輸入錯誤";

  var roomName = ["魁", "晶", "阜", "寶", "帝", "彤", "牡", "蒼", "岡"];
  let matrix = [
    {
      name: "魁",
      value: -1,
      check: [
        [1, 2],
        [3, 6],
        [4, 8],
      ],
    },
    {
      name: "晶",
      value: -1,
      check: [
        [0, 2],
        [4, 7],
      ],
    },
    {
      name: "阜",
      value: -1,
      check: [
        [0, 1],
        [4, 6],
        [5, 8],
      ],
    },
    {
      name: "寶",
      value: -1,
      check: [
        [0, 6],
        [4, 5],
      ],
    },
    { name: "帝", value: -1, check: [] },
    {
      name: "彤",
      value: -1,
      check: [
        [3, 4],
        [2, 8],
      ],
    },
    {
      name: "牡",
      value: -1,
      check: [
        [0, 3],
        [2, 4],
        [7, 8],
      ],
    },
    {
      name: "蒼",
      value: -1,
      check: [
        [1, 4],
        [6, 8],
      ],
    },
    {
      name: "岡",
      value: -1,
      check: [
        [2, 5],
        [0, 4],
        [6, 7],
      ],
    },
  ];

  matrix[4].value = sum / 3;

  // 無腦題處理
  if (matrix[4].value == rooms[0].value && matrix[4].value == rooms[1].value) {
    matrix.forEach(data => {
      data.value = sum / 3;
    });
    return matrix;
  }

  rooms.forEach(room => {
    console.log(room);
    room.order = roomName.indexOf(room.name);
    if (room.order == -1) throw "房間名填寫錯誤，請檢查是否錯字";
    if (room.value > 9 || room.value <= 0) throw room.name + "水晶數填寫錯誤";

    matrix[room.order].value = room.value;
  });

  if (rooms[0].order + rooms[1].order == 8) throw "確定房間名是這樣嗎..? 這組無法計算出結果!!";

  let count = 0;

  do {
    matrix.forEach(data => {
      if (data.value != -1) return;

      data.check.forEach(rooms => {
        if (matrix[rooms[0]].value == -1 || matrix[rooms[1]].value == -1) return;

        data.value = sum - (matrix[rooms[0]].value + matrix[rooms[1]].value);
      });
    });

    count++;
  } while (isFinish(matrix) == false && count < 5);

  return matrix;
}

function isFinish(matrix) {
  let result = matrix.find(data => data.value === -1);
  return result === undefined ? true : false;
}

/**
 * 七星隱藏關卡解謎
 * @param {Message} Message
 * @param {Object} props
 */
exports.SevenStar = (Message, props) => {
  const { number } = props.groups;
  let num = parseInt(number);

  try {
    if (num > 127 || num <= 0) throw new QuestError("數字輸入錯誤，須介於 1~127");

    let bins = (+num).toString(2);
    while (bins.length < 7) {
      bins = "0" + bins;
    }

    let numAry = ["一", "二", "三", "四", "五", "六", "七"];
    let msg = "";
    msg += numAry.join(" ");
    msg += "\n==================\n";
    msg += bins
      .split("")
      .map(bin => (bin === "1" ? "開" : "關"))
      .join(" ");
    msg += "\n==================";

    Message.channel.send(`\`\`\`\n${msg}\n\`\`\``);
  } catch (e) {
    if (!(e instanceof QuestError)) throw e;
    Message.channel.send(e.message);
  }
};

function QuestError(message) {
  this.message = message;
}

function getAllPossible(num, leak) {
  let result = [];
  let numAry = Array.from(Array(10).keys()).slice(1);

  let FS = numAry.filter(function (num) {
    return num != leak;
  });
  let SS = numAry.filter(function (num) {
    return num != leak;
  });

  FS.forEach(first => {
    SS.forEach(second => {
      let third = num - first - second;

      if (first == second) return;
      if (third > 9 || third <= 0 || third == leak || third == second || third == first) return;

      result.push([first, second, third].sort());
    });
  });

  let newAry = [];

  result.sort().forEach(data => {
    let check = data.join();

    if (newAry.indexOf(check) == -1) {
      newAry.push(check);
    }
  });

  newAry = newAry.map(data => {
    return data.split(",").map(str => {
      return parseInt(str);
    });
  });

  return newAry;
}

function getGodQuestResult(sum, leak) {
  var possibleAry = getAllPossible(sum * 3 - 45, leak);
  var objPossible = [];

  possibleAry.forEach(triAry => {
    for (let i = 0; i < 3; i++) {
      let firstOne = sum - leak - triAry[i] - triAry[(i + 1) % 3];

      if (firstOne > 9 || firstOne <= 0) {
        continue;
      }

      let usedAry = triAry.slice();
      usedAry.push(leak);

      if (usedAry.indexOf(firstOne) != -1) {
        continue;
      }

      usedAry.push(firstOne);

      let availableNumAry = Array.from(Array(10).keys()).slice(1);

      availableNumAry = availableNumAry.filter(function (num) {
        return usedAry.indexOf(num) == -1;
      });

      let a = triAry[i % 3];
      let b = triAry[(i + 1) % 3];
      let c = triAry[(i + 2) % 3];

      let bottom = sum - b - c;

      let bottomResult = availableNumAry.find(function (num) {
        return availableNumAry.indexOf(bottom - num) != -1 && bottom - num != num;
      });

      if (bottomResult == undefined || bottomResult == bottom) {
        continue;
      }

      objPossible.push(
        [a, leak, firstOne, b, bottomResult, bottom - bottomResult, c].concat(
          availableNumAry.filter(function (num) {
            return num != bottomResult && num != bottom - bottomResult;
          })
        )
      );
    }
  });

  return objPossible;
}

function genGodQuestMessage(result) {
  let orderDisplay = [[0], [1, 8], [2, 7], [3, 4, 5, 6]];
  return orderDisplay.map(idxs => idxs.map(idx => result[idx]).join("\t")).join("\n");
}

/**
 * 神武禁地解謎
 * @param {Message} Message
 * @param {Object} props
 */
exports.GodQuest = (Message, props) => {
  const { sum, leak } = props.groups;

  try {
    let results = getGodQuestResult(parseInt(sum), parseInt(leak));
    if (results.length <= 1) throw new QuestError("計算失敗！");

    Message.channel.send(["```", genGodQuestMessage(results[0]), "```"].join("\n"));
  } catch (e) {
    if (!(e instanceof QuestError)) throw e;
    Message.channel.send(e.message);
  }
};
