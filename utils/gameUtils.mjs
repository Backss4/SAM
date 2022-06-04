export const MAP_SIZE = 21;
export const BOX_COUNT = 200;
export const EMPTY_PLACE = 0;
export const BOX_PLACE = 1;
export const HARD_WALL = 2;

export const generateNewGame = () => {
  const map = Array(MAP_SIZE)
    .fill(0)
    .map(() =>
      Array(MAP_SIZE)
        .fill(0)
        .map(() => ({
          type: EMPTY_PLACE,
          player: null,
          bomb: false,
          powerup: 0,
          explosion: [],
        }))
    );

  for (let y = 0; y < MAP_SIZE; y++) {
    for (let x = 0; x < MAP_SIZE; x++) {
      if ((y + 1) % 2 === 0 && (x + 1) % 2 === 0) {
        map[y][x].type = HARD_WALL;
      }
    }
  }

  let count = 0;
  while (count < BOX_COUNT) {
    const x = Math.floor(Math.random() * MAP_SIZE);
    const y = Math.floor(Math.random() * MAP_SIZE);
    if (map[y][x].type === EMPTY_PLACE) {
      map[y][x].type = BOX_PLACE;
      count++;
    }
  }

  map[0][0].type = EMPTY_PLACE;
  map[0][1].type = EMPTY_PLACE;
  map[1][0].type = EMPTY_PLACE;

  map[MAP_SIZE - 1][0].type = EMPTY_PLACE;
  map[MAP_SIZE - 1][1].type = EMPTY_PLACE;
  map[MAP_SIZE - 2][0].type = EMPTY_PLACE;

  map[MAP_SIZE - 1][MAP_SIZE - 1].type = EMPTY_PLACE;
  map[MAP_SIZE - 1][MAP_SIZE - 2].type = EMPTY_PLACE;
  map[MAP_SIZE - 2][MAP_SIZE - 1].type = EMPTY_PLACE;

  map[0][MAP_SIZE - 1].type = EMPTY_PLACE;
  map[0][MAP_SIZE - 2].type = EMPTY_PLACE;
  map[1][MAP_SIZE - 1].type = EMPTY_PLACE;

  return map;
};

export const updateMapWithExplosion = (map, bomb, sign = "+", id) => {
  if (sign === "+") map[bomb.y][bomb.x].explosion.push(id);
  else
    map[bomb.y][bomb.x].explosion = map[bomb.y][bomb.x].explosion.filter(
      (s) => s !== id
    );

  let count = 0;
  let y = bomb.y;

  // expand explosion on 4 sides

  while (count < bomb.length && y >= 0) {
    if (map[y][bomb.x].type === HARD_WALL) {
      break;
    }
    if (map[y][bomb.x].type === BOX_PLACE) {
      map[y][bomb.x].type = EMPTY_PLACE;
    }

    if (sign === "+") map[y][bomb.x].explosion.push(id);
    else
      map[y][bomb.x].explosion = map[y][bomb.x].explosion.filter(
        (s) => s !== id
      );

    count++;
    y--;
  }
  count = 0;
  y = bomb.y;

  while (count < bomb.length && y <= MAP_SIZE - 1) {
    if (map[y][bomb.x].type === HARD_WALL) {
      break;
    }
    if (map[y][bomb.x].type === BOX_PLACE) {
      map[y][bomb.x].type = EMPTY_PLACE;
    }

    if (sign === "+") map[y][bomb.x].explosion.push(id);
    else
      map[y][bomb.x].explosion = map[y][bomb.x].explosion.filter(
        (s) => s !== id
      );

    count++;
    y++;
  }

  count = 0;
  let x = bomb.x;

  while (count < bomb.length && x >= 0) {
    if (map[bomb.y][x].type === HARD_WALL) {
      break;
    }
    if (map[bomb.y][x].type === BOX_PLACE) {
      map[bomb.y][x].type = EMPTY_PLACE;
    }

    if (sign === "+") map[bomb.y][x].explosion.push(id);
    else
      map[bomb.y][x].explosion = map[bomb.y][x].explosion.filter(
        (s) => s !== id
      );

    count++;
    x--;
  }

  count = 0;
  x = bomb.x;

  while (count < bomb.length && x <= MAP_SIZE - 1) {
    if (map[bomb.y][x].type === HARD_WALL) {
      break;
    }
    if (map[bomb.y][x].type === BOX_PLACE) {
      map[bomb.y][x].type = EMPTY_PLACE;
    }

    if (sign === "+") map[bomb.y][x].explosion.push(id);
    else
      map[bomb.y][x].explosion = map[bomb.y][x].explosion.filter(
        (s) => s !== id
      );

    count++;
    x++;
  }
};
