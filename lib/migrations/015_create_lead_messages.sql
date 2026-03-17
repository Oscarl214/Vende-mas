-- Lead message history: logs every outbound message sent to a lead
CREATE TABLE public.lead_messages (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id   uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message   text NOT NULL,
  channel   text NOT NULL CHECK (channel IN ('sms', 'whatsapp', 'email')),
  sent_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own lead messages"
  ON public.lead_messages
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX lead_messages_lead_id_idx ON public.lead_messages (lead_id);
