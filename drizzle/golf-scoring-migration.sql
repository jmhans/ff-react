-- Golf Scoring System Migration
-- Run this to create the golf scoring tables

-- Courses table
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  location TEXT,
  pars JSONB NOT NULL,
  hole_details JSONB,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Golf rounds table
CREATE TABLE IF NOT EXISTS golf_rounds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  date DATE NOT NULL,
  season INTEGER NOT NULL,
  round_type VARCHAR(50),
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_golf_rounds_date ON golf_rounds(date);
CREATE INDEX IF NOT EXISTS idx_golf_rounds_season ON golf_rounds(season);

-- Round groups table (for 2-man, 4-man groupings)
CREATE TABLE IF NOT EXISTS round_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  round_id UUID NOT NULL REFERENCES golf_rounds(id) ON DELETE CASCADE ON UPDATE CASCADE,
  group_number INTEGER NOT NULL,
  group_type VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_round_groups_round ON round_groups(round_id);

-- Round scores table (one per golfer per round)
CREATE TABLE IF NOT EXISTS round_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  round_id UUID NOT NULL REFERENCES golf_rounds(id) ON DELETE CASCADE ON UPDATE CASCADE,
  golfer_id UUID NOT NULL REFERENCES golfers(id) ON DELETE CASCADE ON UPDATE CASCADE,
  group_id UUID REFERENCES round_groups(id) ON DELETE SET NULL ON UPDATE CASCADE,
  
  scores JSONB NOT NULL,
  
  total_gross INTEGER NOT NULL,
  total_net INTEGER NOT NULL,
  total_par INTEGER NOT NULL,
  score_to_par INTEGER NOT NULL,
  
  front_nine_gross INTEGER,
  front_nine_net INTEGER,
  back_nine_gross INTEGER,
  back_nine_net INTEGER,
  
  current_streak INTEGER DEFAULT 0,
  current_streak_type VARCHAR(20),
  longest_streak INTEGER DEFAULT 0,
  longest_streak_type VARCHAR(20),
  
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_round_scores_round ON round_scores(round_id);
CREATE INDEX IF NOT EXISTS idx_round_scores_golfer ON round_scores(golfer_id);
CREATE INDEX IF NOT EXISTS idx_round_scores_round_golfer ON round_scores(round_id, golfer_id);

-- Sample data for testing
-- Insert sample courses
INSERT INTO courses (name, location, pars, hole_details) VALUES
('Apostle Highlands', 'Bayfield, WI', 
 '[5,4,4,3,4,4,5,4,4,3,5,4,3,4,4,5,3,4]'::jsonb,
 '{"holes": [
   {"number": 1, "par": 5, "handicap": 1, "yardage": 520},
   {"number": 2, "par": 4, "handicap": 5, "yardage": 380},
   {"number": 3, "par": 4, "handicap": 7, "yardage": 360},
   {"number": 4, "par": 3, "handicap": 15, "yardage": 175},
   {"number": 5, "par": 4, "handicap": 3, "yardage": 400},
   {"number": 6, "par": 4, "handicap": 11, "yardage": 340},
   {"number": 7, "par": 5, "handicap": 9, "yardage": 490},
   {"number": 8, "par": 4, "handicap": 13, "yardage": 370},
   {"number": 9, "par": 4, "handicap": 17, "yardage": 320},
   {"number": 10, "par": 3, "handicap": 14, "yardage": 180},
   {"number": 11, "par": 5, "handicap": 2, "yardage": 530},
   {"number": 12, "par": 4, "handicap": 6, "yardage": 390},
   {"number": 13, "par": 3, "handicap": 12, "yardage": 165},
   {"number": 14, "par": 4, "handicap": 4, "yardage": 410},
   {"number": 15, "par": 4, "handicap": 8, "yardage": 375},
   {"number": 16, "par": 5, "handicap": 10, "yardage": 510},
   {"number": 17, "par": 3, "handicap": 16, "yardage": 155},
   {"number": 18, "par": 4, "handicap": 18, "yardage": 350}
 ]}'::jsonb
),
('Greywalls', 'Marquette, MI',
 '[5,4,3,4,4,5,4,3,4,4,4,3,4,5,3,5,4,4]'::jsonb,
 '{"holes": [
   {"number": 1, "par": 5, "handicap": 7, "yardage": 540},
   {"number": 2, "par": 4, "handicap": 5, "yardage": 395},
   {"number": 3, "par": 3, "handicap": 17, "yardage": 165},
   {"number": 4, "par": 4, "handicap": 1, "yardage": 425},
   {"number": 5, "par": 4, "handicap": 9, "yardage": 380}
 ]}'::jsonb
)
ON CONFLICT DO NOTHING;

COMMENT ON TABLE courses IS 'Golf courses with hole details and pars';
COMMENT ON TABLE golf_rounds IS 'Individual golf rounds played at courses';
COMMENT ON TABLE round_groups IS 'Groupings of golfers within a round (2-man, 4-man teams)';
COMMENT ON TABLE round_scores IS 'Individual golfer scores for each round with hole-by-hole data in JSONB';
COMMENT ON COLUMN round_scores.scores IS 'JSONB structure: { holes: [{ hole, gross, net, par, scoreToPar, scoreName, putts?, fairwayHit?, gir? }], frontNine: {...}, backNine: {...} }';
