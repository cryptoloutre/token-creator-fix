// Next, React
import { FC, useEffect, useState } from "react";

// Wallet
import { useWallet } from "@solana/wallet-adapter-react";

// Store
import {
  Metaplex,
  MetaplexFileTag,
  bundlrStorage,
  toMetaplexFileFromBrowser,
  walletAdapterIdentity,
} from "@metaplex-foundation/js";

import {
  getMinimumBalanceForRentExemptMint,
  createInitializeMintInstruction,
  MintLayout,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  createSetAuthorityInstruction,
  AuthorityType,
} from "@solana/spl-token";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  DataV2,
  createCreateMetadataAccountV3Instruction,
} from "@metaplex-foundation/mpl-token-metadata";
import { useNetworkConfiguration } from "contexts/NetworkConfigurationProvider";

export const HomeView: FC = ({}) => {
  const wallet = useWallet();
  // const { connection } = useConnection();

  const networkConfig = useNetworkConfiguration();
  const networkSelected = networkConfig.networkConfiguration;

  const [connection, setConnection] = useState<Connection>();

  async function getConnection() {
    let _connection;

    if (networkSelected == "devnet") {
      _connection = new Connection("https://api.devnet.solana.com");
    } else {
      _connection = new Connection(
        "https://rpc.helius.xyz/?api-key=cc778adb-f9ab-45da-ba44-b4096f663c16"
      );
    }

    setConnection(_connection);
  }

  useEffect(() => {
    getConnection();
  }, [networkSelected]);

  const PROGRAM_ID = new PublicKey(
    "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
  );

  const [quantity, setQuantity] = useState(0);
  const [decimals, setDecimals] = useState(9);
  const [tokenName, setTokenName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [metadataURL, setMetadataURL] = useState("");
  const [isChecked, setIsChecked] = useState(false);
  const [disableMintIsChecked, setDisableMintIsChecked] = useState(false);
  const [metadataMethod, setMetadataMethod] = useState("url");
  const [tokenDescription, setTokenDescription] = useState("");
  const [file, setFile] = useState<
    Readonly<{
      buffer: Buffer;
      fileName: string;
      displayName: string;
      uniqueName: string;
      contentType: string | null;
      extension: string | null;
      tags: MetaplexFileTag[];
    }>
  >();
  const [fileName, setFileName] = useState("");
  const [iscreating, setIscreating] = useState(false);
  const [signature, setSignature] = useState("");
  const [error, setError] = useState("");

  const handleFileChange = async (event: any) => {
    const browserFile = event.target.files[0];
    const _file = await toMetaplexFileFromBrowser(browserFile);
    setFile(_file);
    setFileName(_file.fileName);
  };

  const create = async () => {
    console.log("create");
    try {
      setIscreating(true);
      setError("");
      setSignature("");

      let metaplex;

      if (networkSelected == "devnet") {
        metaplex = Metaplex.make(connection)
          .use(walletAdapterIdentity(wallet))
          .use(
            bundlrStorage({
              address: "https://devnet.bundlr.network",
              providerUrl: "https://api.devnet.solana.com",
              timeout: 60000,
            })
          );
      } else {
        metaplex = Metaplex.make(connection)
          .use(walletAdapterIdentity(wallet))
          .use(bundlrStorage());
      }

      const mintKeypair = Keypair.generate();
      const mint = mintKeypair.publicKey;
      const mint_rent = await getMinimumBalanceForRentExemptMint(connection);

      const owner = wallet.publicKey;

      let InitMint: TransactionInstruction;

      const [metadataPDA] = await PublicKey.findProgramAddress(
        [Buffer.from("metadata"), PROGRAM_ID.toBuffer(), mint.toBuffer()],
        PROGRAM_ID
      );

      let URI: string = "";

      if (metadataMethod == "url") {
        if (metadataURL != "") {
          URI = metadataURL;
        } else {
          setIscreating(false);
          setError("Please provide a metadata URL!");
        }
      } else {
        if (file) {
          const ImageUri = await metaplex.storage().upload(file);

          if (ImageUri) {
            const { uri } = await metaplex.nfts().uploadMetadata({
              name: tokenName,
              symbol: symbol,
              description: tokenDescription,
              image: ImageUri,
            });
            if (uri) {
              URI = uri;
            }
          }
        } else {
          setIscreating(false);
          setError("Please provide an image file!");
        }
      }

      if (URI != "") {
        const tokenMetadata: DataV2 = {
          name: tokenName,
          symbol: symbol,
          uri: URI,
          sellerFeeBasisPoints: 0,
          creators: null,
          collection: null,
          uses: null,
        };

        const args = {
          data: tokenMetadata,
          isMutable: true,
          collectionDetails: null,
        };

        const createMintAccountInstruction = SystemProgram.createAccount({
          fromPubkey: owner,
          newAccountPubkey: mint,
          space: MintLayout.span,
          lamports: mint_rent,
          programId: TOKEN_PROGRAM_ID,
        });

        if (isChecked) {
          InitMint = createInitializeMintInstruction(
            mint,
            decimals,
            owner,
            owner,
            TOKEN_PROGRAM_ID
          );
        } else {
          InitMint = createInitializeMintInstruction(
            mint,
            decimals,
            owner,
            null,
            TOKEN_PROGRAM_ID
          );
        }

        const associatedTokenAccount = await getAssociatedTokenAddress(
          mint,
          owner
        );

        const createATAInstruction = createAssociatedTokenAccountInstruction(
          owner,
          associatedTokenAccount,
          owner,
          mint
        );

        const mintInstruction = createMintToInstruction(
          mint,
          associatedTokenAccount,
          owner,
          quantity * 10 ** decimals,
          []
        );

        const MetadataInstruction = createCreateMetadataAccountV3Instruction(
          {
            metadata: metadataPDA,
            mint: mint,
            mintAuthority: owner,
            payer: owner,
            updateAuthority: owner,
          },
          {
            createMetadataAccountArgsV3: args,
          }
        );

        const createAccountTransaction = new Transaction().add(
          createMintAccountInstruction,
          InitMint,
          createATAInstruction,
          mintInstruction,
          MetadataInstruction
        );

        if (disableMintIsChecked == true) {
          createAccountTransaction.add(createSetAuthorityInstruction(mint, owner, AuthorityType.MintTokens,null))
        }

        const createAccountSignature = await wallet.sendTransaction(
          createAccountTransaction,
          connection,
          { signers: [mintKeypair] }
        );

        const createAccountconfirmed = await connection.confirmTransaction(
          createAccountSignature,
          "confirmed"
        );

        const signature = createAccountSignature.toString();

        console.log(signature);
        setIscreating(false);
        setSignature(signature);
      }
    } catch (error) {
      setIscreating(false);
      const err = (error as any)?.message;
      setError(err);
    }
  };
  return (
    <div className="md:hero mx-auto w-full p-4">
      <div className="md:hero-content flex flex-col">
        <div className="mt-6 ">
          <h1 className="text-2xl uppercase font-bold underline">
            Create a Solana token
          </h1>

          <div className="md:w-[480px] flex flex-col m-auto">
            <div className="my-2 uppercase underline flex font-bold text-2xl">
              Token infos
            </div>
            <label className="underline flex font-bold">Token Name</label>
            <input
              className="my-[1%] md:w-[480px] text-left text-black pl-1 border-2 rounded-2xl border-black"
              type="text"
              placeholder="Token Name"
              onChange={(e) => setTokenName(e.target.value)}
            />

            <label className="underline flex font-bold">Symbol</label>
            <input
              className="my-[1%] md:w-[480px] text-left text-black pl-1 border-2 rounded-2xl border-black"
              type="text"
              placeholder="Symbol"
              onChange={(e) => setSymbol(e.target.value)}
            />

            <label className="underline flex font-bold">
              Number of tokens to mint
            </label>
            <input
              className="my-[1%] md:w-[480px] text-left text-black pl-1 border-2 rounded-2xl border-black"
              type="number"
              min="0"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value))}
            />

            <label className="underline flex font-bold">
              Number of decimals
            </label>
            <input
              className="my-[1%] md:w-[480px] text-left text-black pl-1 border-2 rounded-2xl border-black"
              type="number"
              min="0"
              value={decimals}
              onChange={(e) => setDecimals(parseInt(e.target.value))}
            />

            <div className="mt-5 mb-2 uppercase underline flex font-bold text-2xl">
              Metadatas
            </div>
            <div className="flex justify-center">
              {metadataMethod == "url" ? (
                <button className="text-white mx-2  font-semibold bg-[#343e4f] md:w-[280px] rounded-full shadow-xl border">
                  Use an existing medatata URL
                </button>
              ) : (
                <button
                  className="text-white mx-2  font-semibold bg-[#667182] md:w-[280px] rounded-full shadow-xl border"
                  onClick={() => {
                    setMetadataMethod("url"), setTokenDescription("");
                  }}
                >
                  Use an existing medatata URL
                </button>
              )}
              {metadataMethod == "upload" ? (
                <button className="text-white mx-2 font-semibold bg-[#343e4f] md:w-[200px] rounded-full shadow-xl border">
                  Create the metadata
                </button>
              ) : (
                <button
                  className="text-white mx-2 font-semibold bg-[#667182] md:w-[200px] rounded-full shadow-xl border"
                  onClick={() => {
                    setMetadataMethod("upload"),
                      setMetadataURL(""),
                      setFile(undefined),
                      setFileName("");
                  }}
                >
                  Create the metadata
                </button>
              )}
            </div>

            {metadataMethod == "url" && (
              <div>
                <div>
                  <label className="underline mt-2 flex font-bold">
                    Metadata Url
                  </label>
                  <input
                    className="my-[1%] md:w-[480px] text-left text-black pl-1 border-2 rounded-2xl border-black"
                    type="text"
                    placeholder="Metadata Url"
                    onChange={(e) => setMetadataURL(e.target.value)}
                  />
                </div>
              </div>
            )}

            {metadataMethod == "upload" && (
              <div>
                <div>
                  <label className="underline mt-2 flex font-bold">
                    Description
                  </label>
                  <input
                    className="my-[1%] md:w-[480px] text-left text-black pl-1 border-2 rounded-2xl border-black"
                    type="text"
                    placeholder="Description of the token/project"
                    onChange={(e) => setTokenDescription(e.target.value)}
                  />
                </div>
                <div>
                  <label className="underline mt-2 flex font-bold">Image</label>
                  <label
                    htmlFor="file"
                    className="text-white font-semibold rounded-full shadow-xl bg-[#414e63] border px-2 py-1 h-[40px] uppercase hover:bg-[#2C3B52] hover:cursor-pointer"
                  >
                    Upload image
                    <input
                      id="file"
                      type="file"
                      name="file"
                      accept="image/*, video/*"
                      onChange={handleFileChange}
                      style={{ display: "none" }}
                    />
                  </label>
                  {fileName != "" && <div className="mt-2">{fileName}</div>}
                </div>
              </div>
            )}

            <div className="mt-5 mb-2 uppercase underline font-bold text-2xl">
              Authority
            </div>
            <div className="mb-4">
              <label className="mx-2">Enable freeze authority</label>
              <input
                className="mx-2"
                type="checkbox"
                checked={isChecked}
                onChange={(e) => setIsChecked(!isChecked)}
              />
            </div>
            <div className="mb-4">
              <label className="mx-2">Disable mint authority</label>
              <input
                className="mx-2"
                type="checkbox"
                checked={disableMintIsChecked}
                onChange={(e) => setDisableMintIsChecked(!isChecked)}
              />
            </div>
          </div>

          <div className="flex justify-center">
            {iscreating ? (
              <button className="font-bold px-4 py-2 bg-[#445566] rounded-xl hover:scale-110">
                <svg
                  role="status"
                  className="inline mr-3 w-4 h-4 text-white animate-spin"
                  viewBox="0 0 100 101"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                    fill="#E5E7EB"
                  />
                  <path
                    d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                    fill="currentColor"
                  />
                </svg>
                Creating...
              </button>
            ) : (
              <button
                className="font-bold px-4 py-2 bg-[#445566] rounded-xl hover:scale-110"
                onClick={create}
              >
                Create Token
              </button>
            )}
          </div>
          
          <div className="flex justify-center">
            {signature !== "" && (
              <div className="mt-2">
                ✅ Successfuly created! Check it{" "}
                <a
                  target="_blank"
                  href={"https://solscan.io/tx/" + signature}
                  rel="noreferrer"
                >
                  <strong className="underline">here</strong>
                </a>
              </div>
            )}
          </div>

          <div className="flex justify-center">
            {error != "" && <div className="mt-2">❌ Ohoh.. {error}</div>}
          </div>
        </div>
      </div>
    </div>
  );
};
