import { useInfiniteActiveStores } from "@spaceman/app-query";
import type { Store } from "@spaceman/app-types";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { missingMarketplace, STORE_PAGE } from "../catalog";
import { useCustomer } from "../context";
import {
  CheckIcon,
  ChevronIcon,
  PinIcon,
  SearchIcon,
  UserIcon,
} from "../icons";
import {
  greeting,
  isOpenNow,
  localPhone,
  offersDelivery,
} from "../domain/store";
import {
  Brand,
  CartButton,
  FloatingCart,
  Photo,
  StoreFacts,
  storeImage,
  storeTone,
} from "../ui";

const supportPhone = import.meta.env.VITE_SUPPORT_PHONE_E164 as
  string | undefined;

function StoreCard({ store }: { store: Store }) {
  return (
    <li>
      <Link className="rcard" to={`/r/${encodeURIComponent(store.id)}`}>
        <Photo
          alt={store.cardMedia?.altText ?? store.name}
          src={storeImage(store)}
          tone={storeTone(store)}
        >
          <span className="ribbon">
            <span className="o">Verified kitchen</span>
          </span>
        </Photo>
        <span className="rname">{store.name}</span>
        <span className="rsub">
          {store.address.locality ?? store.address.formattedAddress} ·{" "}
          {store.category}
        </span>
        <StoreFacts store={store} />
      </Link>
    </li>
  );
}

export function Home() {
  const { marketplace, session, pin } = useCustomer();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [openOnly, setOpenOnly] = useState(false);
  const [deliveryOnly, setDeliveryOnly] = useState(false);
  const stores = useInfiniteActiveStores(
    marketplace ?? missingMarketplace,
    STORE_PAGE,
  );
  const records = useMemo(
    () => stores.data?.pages.flatMap((page) => page.records) ?? [],
    [stores.data],
  );
  const categories = useMemo(
    () => [
      "All",
      ...new Set(records.map((store) => store.category).filter(Boolean)),
    ],
    [records],
  );
  const query = search.trim().toLocaleLowerCase("en-ZA");
  const visible = records.filter(
    (store) =>
      (!query ||
        [
          store.name,
          store.category,
          store.description,
          store.address.locality ?? "",
          store.address.formattedAddress,
        ]
          .join(" ")
          .toLocaleLowerCase("en-ZA")
          .includes(query)) &&
      (category === "All" || store.category === category) &&
      (!openOnly || isOpenNow(store)) &&
      (!deliveryOnly || offersDelivery(store)),
  );
  const filtered =
    category !== "All" || openOnly || deliveryOnly || Boolean(search.trim());
  const failed = stores.isError || stores.isRefetchError;
  const firstName = session?.profile?.displayName.split(" ")[0];

  return (
    <>
      <Brand />
      <div className="top">
        <div className="deliver">
          <small>Deliver to</small>
          <Link className={pin ? "pinBtn set" : "pinBtn"} to="/location">
            {pin ? <CheckIcon /> : <PinIcon />}
            <span>{pin ? "Exact spot pinned" : "Pin exact location"}</span>
          </Link>
        </div>
        <Link
          aria-label={session ? "My account" : "Log in or sign up"}
          className="circle acctBtn"
          to="/account"
        >
          {firstName ? firstName.charAt(0).toUpperCase() : <UserIcon />}
        </Link>
        <CartButton />
      </div>

      <p className="greet">
        Hey {firstName ?? "there"}, <b>{greeting()}</b>
      </p>
      <h1 className="hero1">
        Ready to order?
        <br />
        We’re ready to <span>deliver.</span>
      </h1>

      <label className="search">
        <SearchIcon />
        <span className="sr-only">Search restaurants</span>
        <input
          autoComplete="off"
          placeholder="Search restaurants"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>

      {categories.length > 1 ? (
        <>
          <div className="sec">
            <h2>All Categories</h2>
          </div>
          <div aria-label="Categories" className="cats" role="group">
            {categories.map((value) => (
              <button
                aria-pressed={category === value}
                className="cat"
                key={value}
                type="button"
                onClick={() => setCategory(value)}
              >
                <i aria-hidden="true">
                  {value === "All" ? "★" : value.charAt(0)}
                </i>
                {value}
              </button>
            ))}
          </div>
        </>
      ) : null}

      <div aria-label="Filters" className="tags" role="group">
        <button
          aria-pressed={openOnly}
          className="tag"
          type="button"
          onClick={() => setOpenOnly((value) => !value)}
        >
          Open now
        </button>
        <button
          aria-pressed={deliveryOnly}
          className="tag"
          type="button"
          onClick={() => setDeliveryOnly((value) => !value)}
        >
          Delivery
        </button>
      </div>

      <div className="sec">
        <h2>Restaurants ({visible.length})</h2>
        {filtered ? (
          <button
            className="see"
            type="button"
            onClick={() => {
              setCategory("All");
              setOpenOnly(false);
              setDeliveryOnly(false);
              setSearch("");
            }}
          >
            Clear filters <ChevronIcon />
          </button>
        ) : null}
      </div>

      {failed ? (
        <div className="note" role="alert">
          {records.length
            ? "Couldn’t refresh restaurants. Showing what was loaded before."
            : "Restaurants can’t be loaded right now. Check your connection."}{" "}
          <button
            className="linkBtn"
            type="button"
            onClick={() => void stores.refetch()}
          >
            Try again
          </button>
        </div>
      ) : null}

      {stores.isLoading ? (
        <p className="empty" role="status">
          Loading restaurants…
        </p>
      ) : visible.length ? (
        <ul className="rlist">
          {visible.map((store) => (
            <StoreCard key={store.id} store={store} />
          ))}
        </ul>
      ) : !failed ? (
        <p className="empty">
          {filtered
            ? "No restaurants match. Try another search or clear the filters."
            : "No restaurants are taking orders yet. Check back soon."}
        </p>
      ) : null}

      {stores.hasNextPage ? (
        <button
          className="cta ghost cta-sm more"
          disabled={stores.isFetchingNextPage}
          type="button"
          onClick={() => void stores.fetchNextPage()}
        >
          {stores.isFetchingNextPage ? "Loading…" : "Show more restaurants"}
        </button>
      ) : null}

      <footer className="sfoot">
        <Brand footer />
        <p>
          Morula View based delivery service, serving Mabopane, Soshanguve and
          surrounds.
        </p>
        <div className="svc">
          <span>Food &amp; Bev</span>
          <span>Parcels</span>
          <span>Medical Supply</span>
          <span>More</span>
        </div>
        {supportPhone ? (
          <p>
            WhatsApp or call{" "}
            <b className="selectable">{localPhone(supportPhone)}</b>
          </p>
        ) : null}
        <p>spacemanprojects.co.za · #onthemove</p>
      </footer>
      <FloatingCart />
    </>
  );
}
