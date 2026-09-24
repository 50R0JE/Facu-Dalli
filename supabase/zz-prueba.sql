select public.routine_days_ok('[{"id":"d1","name":"x","exercises":[{"id":"ab3x9_z","video":"https://youtu.be/a","sets":[{"id":"s1"},{"id":"7f3e2c1a-1b2c-4d5e-8f90-123456789abc"}]}]}]') as ok_normal,
       public.routine_days_ok('[{"id":"d1","exercises":[]},{"id":"d2"}]') as ok_vacia,
       public.routine_days_ok('[{"id":"\"><img src=x>","exercises":[]}]') as mal_dia,
       public.routine_days_ok('[{"id":"d1","exercises":[{"id":"e1","sets":[{"id":"<b>"}]}]}]') as mal_serie,
       public.routine_days_ok('[{"id":"d1","exercises":[{"id":"e1","video":"javascript:alert(1)"}]}]') as mal_video;
