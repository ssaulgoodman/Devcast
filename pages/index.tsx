import { useSession, signIn } from 'next-auth/react';
import Head from 'next/head';
import Link from 'next/link';
import styles from '@/styles/Home.module.css';

export default function Home() {
  const { data: session, status } = useSession();
  const loading = status === 'loading';

  return (
    <div className={styles.container}>
      <Head>
        <title>DevCast - Your Automated Build-in-Public Assistant</title>
        <meta
          name="description"
          content="DevCast automates the translation of development activities into engaging social media updates."
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>
          Welcome to <span className={styles.highlight}>DevCast</span>
        </h1>

        <p className={styles.description}>
          Automatically create social media content from your development activities.
        </p>

        <div className={styles.hero}>
          <div className={styles.heroContent}>
            <h2>Build in Public Without Breaking Your Flow</h2>
            <p>
              DevCast monitors your GitHub activity and crafts engaging tweets that showcase your
              progress. No more context-switching to share what you're building.
            </p>
            {!session && !loading && (
              <button className={styles.button} onClick={() => signIn('github')}>
                Get Started with GitHub
              </button>
            )}
            {session && (
              <Link href="/dashboard" className={styles.button}>
                Go to Dashboard
              </Link>
            )}
          </div>
          <div className={styles.heroImage}>
            <img src="/assets/hero-illustration.svg" alt="DevCast illustration" />
          </div>
        </div>

        <div className={styles.features}>
          <div className={styles.card}>
            <h3>GitHub Integration</h3>
            <p>
              Connect your GitHub account to automatically track commits, pull requests, and other
              development activity.
            </p>
          </div>

          <div className={styles.card}>
            <h3>Smart Content Generation</h3>
            <p>
              Our AI analyzes your development work and creates engaging social media updates that
              highlight your progress.
            </p>
          </div>

          <div className={styles.card}>
            <h3>Telegram Approval Flow</h3>
            <p>
              Review and approve posts with minimal friction using our Telegram bot. Edit or
              schedule with simple commands.
            </p>
          </div>

          <div className={styles.card}>
            <h3>Twitter Integration</h3>
            <p>
              Automatically post approved updates to Twitter/X, maintaining a consistent
              build-in-public presence.
            </p>
          </div>
        </div>
      </main>

      <footer className={styles.footer}>
        <p>DevCast &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
} 