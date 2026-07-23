
-- Enums
CREATE TYPE public.app_role AS ENUM ('learner','teacher','admin');
CREATE TYPE public.course_category AS ENUM ('listening','reading','writing','speaking','vocabulary','grammar','mock_test');
CREATE TYPE public.course_level AS ENUM ('beginner','intermediate','advanced');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  headline TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Auto-create profile + learner role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)));
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'learner'));
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Courses
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  teacher_name TEXT NOT NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  category course_category NOT NULL,
  level course_level NOT NULL DEFAULT 'intermediate',
  target_band NUMERIC(2,1),
  duration_hours NUMERIC(4,1) NOT NULL DEFAULT 4,
  thumbnail_url TEXT,
  preview_video_url TEXT,
  is_published BOOLEAN NOT NULL DEFAULT true,
  popularity INT NOT NULL DEFAULT 0,
  student_count INT NOT NULL DEFAULT 0,
  rating NUMERIC(2,1) NOT NULL DEFAULT 4.7,
  is_trending BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.courses TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.courses TO authenticated;
GRANT ALL ON public.courses TO service_role;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "published courses public" ON public.courses FOR SELECT USING (is_published = true);
CREATE POLICY "teachers view own" ON public.courses FOR SELECT USING (auth.uid() = teacher_id);
CREATE POLICY "teachers manage own" ON public.courses FOR ALL
  USING (auth.uid() = teacher_id AND public.has_role(auth.uid(), 'teacher'))
  WITH CHECK (auth.uid() = teacher_id AND public.has_role(auth.uid(), 'teacher'));

-- Lessons
CREATE TABLE public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  ordering INT NOT NULL DEFAULT 1,
  duration_min INT NOT NULL DEFAULT 10,
  video_url TEXT
);
GRANT SELECT ON public.lessons TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lessons TO authenticated;
GRANT ALL ON public.lessons TO service_role;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lessons public" ON public.lessons FOR SELECT USING (true);

-- Enrollments
CREATE TABLE public.enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  progress INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, course_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.enrollments TO authenticated;
GRANT ALL ON public.enrollments TO service_role;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own enrollments" ON public.enrollments FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Seed courses (teacher_id NULL, teacher_name embedded for display)
INSERT INTO public.courses (teacher_name, title, slug, description, category, level, target_band, duration_hours, thumbnail_url, popularity, student_count, rating, is_trending) VALUES
('Dr. Sarah Ahmed','IELTS Listening Mastery: Sections 1–4','listening-mastery','Sharpen your ear for every section of the IELTS Listening test with authentic audio, note-taking strategies, and full practice sets.','listening','intermediate',7.5,8,'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=800&auto=format&fit=crop',980,4210,4.9,true),
('James Miller','Academic Reading: Skimming, Scanning, Speed','academic-reading-speed','Master the 3 core reading strategies to finish all 40 questions in 60 minutes with confidence.','reading','intermediate',7.0,6,'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=800&auto=format&fit=crop',870,3620,4.8,true),
('Priya Nair','Writing Task 2: Band 8 Essay Framework','writing-task-2-framework','A step-by-step framework to plan, structure, and write Band 8+ essays under 40 minutes.','writing','advanced',8.0,10,'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800&auto=format&fit=crop',1250,5890,4.9,true),
('Michael Chen','Speaking Fluency: Part 1, 2 & 3','speaking-fluency','Speak naturally with cue-card templates, vocabulary boosters, and mock interviews.','speaking','beginner',6.5,5,'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=800&auto=format&fit=crop',760,3100,4.7,false),
('Aisha Rahman','IELTS Vocabulary: 1000 Band 8 Words','vocab-1000','Learn high-band vocabulary with context, collocations, and daily practice.','vocabulary','intermediate',7.0,7,'https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=800&auto=format&fit=crop',540,2100,4.6,false),
('Dr. Sarah Ahmed','Grammar for IELTS: Complex Structures','grammar-complex','Master relative clauses, conditionals, and inversion — the grammar Band 8 writers use.','grammar','advanced',7.5,6,'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&auto=format&fit=crop',430,1780,4.5,false),
('James Miller','Full IELTS Mock Test Pack (Academic)','mock-test-academic','Six full-length mock tests with detailed answer keys and video walkthroughs.','mock_test','intermediate',7.0,12,'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&auto=format&fit=crop',1420,6210,4.9,true),
('Priya Nair','Writing Task 1: Charts, Graphs & Maps','writing-task-1','Describe every visual with confidence — bar charts, line graphs, pie charts, processes, maps.','writing','intermediate',7.0,6,'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop',680,2540,4.7,false),
('Michael Chen','Speaking Part 2: 50 Cue Cards Solved','speaking-cue-cards','Confidently tackle any cue card with 50 model answers across every topic.','speaking','intermediate',7.0,4,'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800&auto=format&fit=crop',920,3980,4.8,true),
('Aisha Rahman','Listening: Map & Diagram Labelling','listening-maps','A focused mini-course on the trickiest listening question type.','listening','beginner',6.0,3,'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=800&auto=format&fit=crop',320,1210,4.6,false),
('Dr. Sarah Ahmed','Reading: True / False / Not Given Decoded','reading-tfng','Never guess again on the most confusing question type in Academic Reading.','reading','intermediate',7.0,4,'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800&auto=format&fit=crop',610,2340,4.8,false),
('James Miller','Pronunciation for Band 8 Speaking','pronunciation-band-8','Word stress, intonation, and connected speech — the pronunciation habits examiners reward.','speaking','advanced',8.0,5,'https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=800&auto=format&fit=crop',290,980,4.7,false);
