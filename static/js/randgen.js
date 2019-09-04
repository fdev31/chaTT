/* This file re-uses a pseudo-random number generator from a 3rd party
 * You can find all the details at the following URL:
 * https://gist.github.com/blixt/f17b47c62508be59987b
 * */
/**
 * 
 * Creates a pseudo-random value generator. The seed must be an integer.
 *
 * Uses an optimized version of the Park-Miller PRNG.
 * http://www.firstpr.com.au/dsp/rand31/
 */
function Random(seed) {
  this._seed = seed % 2147483647;
  if (this._seed <= 0) this._seed += 2147483646;
}

/**
 * Returns a pseudo-random value between 1 and 2^32 - 2.
 */
Random.prototype.next = function () {
  return this._seed = this._seed * 16807 % 2147483647;
};


/**
 * Returns a pseudo-random floating point number in range [0, 1).
 */
Random.prototype.nextFloat = function (opt_minOrMax, opt_max) {
  // We know that result of next() will be 1 to 2147483646 (inclusive).
  return (this.next() - 1) / 2147483646;
};
/*
 *
 * *************************** END OF 3RD PARTY CODE ********************************
 *
 *
 */

// Some kind of hash function
// takes a `passCode` (String) as input
// returns a list of two pseudo-random Strings
function makeRandomPair(passCode) {
    const iterations = 30;

    function string2string(str) {
        let v = Number(str);
        if (v < 65) {
            v = 65 + (v%62);
        }
        if (v > 90 && v < 97) {
            v = 48 + (v-90);
        }
        if (v>122)
            v = 48+(v%10);
        return String.fromCharCode(v);
    }

    const seed = Number(passCode.split('').map( (c) => {return c.charCodeAt(0)} ).join(''));

    const seedGen = new Random(seed);
    const rand = new Random(seedGen.next());
    const vals = [];
    for (let i=0; i<iterations; i++) {
        vals.push(rand.next());
    }
    const fullString = vals.join('');
    vals.length = 0;
    let index = 0;
    while (index < fullString.length) {
        let offset = 0;
        while (fullString.slice(index, index+offset) < 123) {
            offset++;
            if (index+offset >= fullString.length) break;
        }
        if (fullString.length == index + offset) { // we hit the tail
            vals.push(string2string(fullString.slice(index)));
        } else {
            offset--;
            vals.push( string2string(fullString.slice(index, index+offset) ) );
        }
        index += offset;
    }
    const bigString = vals.join('');
    let splitAt = bigString.length / 2;

    while (bigString.charCodeAt(splitAt) < 60) splitAt++;
    return [ bigString.slice(0, splitAt), bigString.slice(splitAt) ];
}

try {
    module.exports = { makeRandomPair };
} catch {
}
