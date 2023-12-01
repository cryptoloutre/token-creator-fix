import { FC } from "react";
import Link from "next/link";
import Image from "next/image";
export const Footer: FC = () => {
  return (
    <div className="relative mt-8">
      <footer className="border-t-2 border-[#141414] bg-black hover:text-white absolute w-full">
        <div className="ml-12 py-12 mr-12">
          <div className="flex justify-center">
              <div className="mb-6 items-center mx-auto max-w-screen-lg">
                <h5 className="font-normal capitalize tracking-tight  mb-2.5">
                  MADE BY LA LOUTRE
                </h5>

                <div className="flex justify-between mb-0 gap-2">
                  <Link
                    href="https://twitter.com/laloutre"
                    target="_blank"
                    rel="noopener noreferrer"
                    passHref
                    className="text-secondary hover:text-white"
                  >
                    Twitter
                  </Link>
                  <Link
                    href="https://github.com/cryptoloutre/solana-tools"
                    target="_blank"
                    rel="noopener noreferrer"
                    passHref
                    className="text-secondary hover:text-white"
                  >
                    GitHub
                  </Link>
                </div>
              </div>
            </div>
          </div>
      </footer>
    </div>
  );
};
