-- Payment type enum
CREATE TYPE public.parking_payment_type AS ENUM ('free', 'metered', 'paid_lot', 'private');

-- Add columns to parking_spots
ALTER TABLE public.parking_spots
  ADD COLUMN payment_type public.parking_payment_type NOT NULL DEFAULT 'free',
  ADD COLUMN duration_minutes integer NOT NULL DEFAULT 15;

ALTER TABLE public.parking_spots
  ALTER COLUMN expires_at SET DEFAULT (now() + interval '15 minutes');

-- Comments table
CREATE TABLE public.parking_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  spot_id uuid NOT NULL REFERENCES public.parking_spots(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  parent_id uuid REFERENCES public.parking_comments(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 500),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_parking_comments_spot ON public.parking_comments(spot_id);
CREATE INDEX idx_parking_comments_parent ON public.parking_comments(parent_id);

ALTER TABLE public.parking_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comments viewable by authenticated"
  ON public.parking_comments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can add comments"
  ON public.parking_comments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON public.parking_comments FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.parking_comments;
ALTER TABLE public.parking_comments REPLICA IDENTITY FULL;